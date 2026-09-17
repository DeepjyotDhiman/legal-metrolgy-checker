import uuid
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from PIL import Image as PILImage, ImageStat

from app.core.config import settings


class ImageValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ImageService:
    """Secure image upload handling, validation, and storage service."""

    @staticmethod
    def validate_file_metadata(file: UploadFile) -> Tuple[str, str]:
        """Validate filename extension and MIME type.

        Returns:
            Tuple of (sanitized_extension, content_type)
        """
        if not file.filename:
            raise ImageValidationError("Uploaded file has no filename.")

        # Extract and sanitize extension
        ext = Path(file.filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise ImageValidationError(
                f"Unsupported file extension '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        if file.content_type not in settings.ALLOWED_MIME_TYPES:
            raise ImageValidationError(
                f"Unsupported MIME type '{file.content_type}'. Allowed: {', '.join(settings.ALLOWED_MIME_TYPES)}"
            )

        return ext, file.content_type

    @staticmethod
    def compute_image_quality(img: PILImage.Image) -> float:
        """Compute an initial image quality score (0.0 to 1.0) based on resolution and variance."""
        width, height = img.size
        # Minimum acceptable dimensions
        if width < 200 or height < 200:
            return 0.35

        # Measure pixel variance (simple proxy for contrast/sharpness)
        stat = ImageStat.Stat(img.convert("L"))
        variance = stat.var[0] if stat.var else 0.0

        # Normalization heuristics
        resolution_score = min(1.0, (width * height) / (1200 * 1200))
        contrast_score = min(1.0, variance / 2500.0)

        quality_score = (resolution_score * 0.4) + (contrast_score * 0.6)
        return round(max(0.1, min(1.0, quality_score)), 2)

    @classmethod
    async def save_uploaded_image(
        cls,
        file: UploadFile,
        inspection_id: str,
    ) -> Tuple[Path, float]:
        """Validate, verify image integrity with PIL, prevent path traversal, and persist.

        Returns:
            Tuple of (saved_file_path, quality_score)
        """
        ext, _ = cls.validate_file_metadata(file)

        # Read content and enforce strict size limit
        content = await file.read()
        if len(content) > settings.max_upload_size_bytes:
            raise ImageValidationError(
                f"File size exceeds maximum permitted limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        if len(content) == 0:
            raise ImageValidationError("Uploaded file is empty.")

        # Create inspection-specific subfolder in UPLOAD_DIR
        target_dir = settings.UPLOAD_DIR / inspection_id
        target_dir.mkdir(parents=True, exist_ok=True)

        # Generate non-guessable random UUID filename to prevent path traversal completely
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        saved_path = target_dir / unique_filename

        # Write to disk
        try:
            with open(saved_path, "wb") as f:
                f.write(content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist uploaded image: {str(e)}",
            )

        # Verify image integrity with Pillow
        try:
            with PILImage.open(saved_path) as pil_img:
                pil_img.verify()
            # Reopen to calculate quality (verify() may close or invalidate internal image state)
            with PILImage.open(saved_path) as pil_img:
                quality_score = cls.compute_image_quality(pil_img)
        except Exception:
            # If invalid or corrupted image, remove from disk immediately
            if saved_path.exists():
                saved_path.unlink()
            raise ImageValidationError("Uploaded file is not a valid or readable image.")

        return saved_path, quality_score
