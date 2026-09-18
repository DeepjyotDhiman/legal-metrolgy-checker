import type { EvidenceImage, PipelineStage } from './types';

export const REALISTIC_PACKAGE_IMAGES: EvidenceImage[] = [
  {
    id: 'IMG-20250918-0001',
    facetName: 'Image 1 — Front Label',
    filename: 'basmati_rice_5kg_front.jpg',
    fileSize: '2.4 MB',
    dimensions: '900 × 750 px',
    format: 'image/jpeg (24-bit RGB)',
    previewUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
    qualityScore: 0.95,
    isQualityAcceptable: true,
    ocrStatus: 'COMPLETED',
    detectedFieldsCount: 5,
    rawLines: [
      { id: 'l1', text: 'PREMIUM BASMATI RICE', confidence: 0.9996, bbox: { x: 248, y: 42, w: 401, h: 32 } },
      { id: 'l2', text: 'MRP: Rs. 249.00 (inclusive of all taxes)', confidence: 0.9755, bbox: { x: 48, y: 141, w: 526, h: 26 }, fieldKey: 'mrp' },
      { id: 'l3', text: 'Net Quantity: 5 kg', confidence: 0.9580, bbox: { x: 50, y: 202, w: 257, h: 24 }, fieldKey: 'net_qty' },
      { id: 'l4', text: 'Date of Manufacture: 01/2025', confidence: 0.9877, bbox: { x: 50, y: 261, w: 401, h: 24 }, fieldKey: 'mfg_date' },
      { id: 'l5', text: 'Best Before: 24 months from packaging', confidence: 0.9868, bbox: { x: 50, y: 322, w: 489, h: 24 } },
      { id: 'l6', text: 'Manufactured By: Agro Foods India Pvt Ltd', confidence: 0.9831, bbox: { x: 50, y: 381, w: 537, h: 26 }, fieldKey: 'mfg_name' },
      { id: 'l7', text: 'Country of Origin: India', confidence: 0.9968, bbox: { x: 50, y: 441, w: 327, h: 24 }, fieldKey: 'country_origin' }
    ],
    extractedFields: [
      {
        key: 'mrp',
        label: 'Maximum Retail Price (MRP)',
        value: '₹249.00 (inclusive of all taxes)',
        confidence: 0.9755,
        bbox: { x: 48, y: 141, w: 526, h: 26 },
        status: 'DETECTED',
        sourceImageId: 'IMG-20250918-0001'
      },
      {
        key: 'net_qty',
        label: 'Net Quantity',
        value: '5 kg',
        confidence: 0.9580,
        bbox: { x: 50, y: 202, w: 257, h: 24 },
        status: 'DETECTED',
        sourceImageId: 'IMG-20250918-0001'
      },
      {
        key: 'mfg_name',
        label: 'Manufacturer Name',
        value: 'Agro Foods India Pvt Ltd',
        confidence: 0.9831,
        bbox: { x: 50, y: 381, w: 537, h: 26 },
        status: 'DETECTED',
        sourceImageId: 'IMG-20250918-0001'
      },
      {
        key: 'mfg_date',
        label: 'Date of Manufacture',
        value: '01/2025',
        confidence: 0.9877,
        bbox: { x: 50, y: 261, w: 401, h: 24 },
        status: 'DETECTED',
        sourceImageId: 'IMG-20250918-0001'
      },
      {
        key: 'country_origin',
        label: 'Country of Origin',
        value: 'India',
        confidence: 0.9968,
        bbox: { x: 50, y: 441, w: 327, h: 24 },
        status: 'DETECTED',
        sourceImageId: 'IMG-20250918-0001'
      }
    ]
  },
  {
    id: 'IMG-20250918-0002',
    facetName: 'Image 2 — Back Label',
    filename: 'basmati_rice_5kg_back_panel.jpg',
    fileSize: '2.1 MB',
    dimensions: '850 × 700 px',
    format: 'image/jpeg (24-bit RGB)',
    previewUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=850&q=80',
    qualityScore: 0.92,
    isQualityAcceptable: true,
    ocrStatus: 'COMPLETED',
    detectedFieldsCount: 2,
    rawLines: [
      { id: 'b1', text: 'FACTORY REGISTERED ADDRESS:', confidence: 0.9912, bbox: { x: 45, y: 60, w: 380, h: 22 } },
      { id: 'b2', text: 'Plot 42, Industrial Area, Phase II', confidence: 0.9938, bbox: { x: 45, y: 110, w: 441, h: 24 }, fieldKey: 'mfg_address' },
      { id: 'b3', text: 'New Delhi, 110020, India', confidence: 0.9961, bbox: { x: 45, y: 145, w: 322, h: 24 }, fieldKey: 'mfg_address' },
      { id: 'b4', text: 'CUSTOMER FEEDBACK & QUERIES:', confidence: 0.9850, bbox: { x: 45, y: 220, w: 360, h: 22 } },
      { id: 'b5', text: 'Consumer Care: care@agrofoods.com', confidence: 0.9902, bbox: { x: 45, y: 260, w: 472, h: 24 }, fieldKey: 'consumer_care' },
      { id: 'b6', text: 'Toll Free: 1800-11-2233', confidence: 0.9942, bbox: { x: 45, y: 295, w: 313, h: 24 }, fieldKey: 'consumer_care' }
    ],
    extractedFields: [
      {
        key: 'mfg_address',
        label: 'Manufacturer Address',
        value: 'Plot 42, Industrial Area, Phase II, New Delhi 110020',
        confidence: 0.9938,
        bbox: { x: 45, y: 110, w: 441, h: 60 },
        status: 'DETECTED',
        sourceImageId: 'IMG-20250918-0002'
      },
      {
        key: 'consumer_care',
        label: 'Consumer Care Details',
        value: 'care@agrofoods.com / Toll Free: 1800-11-2233',
        confidence: 0.9902,
        bbox: { x: 45, y: 260, w: 472, h: 60 },
        status: 'DETECTED',
        sourceImageId: 'IMG-20250918-0002'
      }
    ]
  },
  {
    id: 'IMG-20250918-0003',
    facetName: 'Image 3 — Side Label',
    filename: 'basmati_rice_5kg_side_panel.jpg',
    fileSize: '1.7 MB',
    dimensions: '600 × 800 px',
    format: 'image/jpeg (24-bit RGB)',
    previewUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
    qualityScore: 0.88,
    isQualityAcceptable: true,
    ocrStatus: 'COMPLETED',
    detectedFieldsCount: 1,
    rawLines: [
      { id: 's1', text: 'NUTRITIONAL INFORMATION PER 100g', confidence: 0.9854, bbox: { x: 30, y: 50, w: 420, h: 24 } },
      { id: 's2', text: 'Energy: 350 kcal', confidence: 0.9910, bbox: { x: 30, y: 100, w: 200, h: 20 } },
      { id: 's3', text: 'Storage: Store in a cool, dry place', confidence: 0.9740, bbox: { x: 30, y: 200, w: 380, h: 20 } }
    ],
    extractedFields: []
  }
];

export const LOW_QUALITY_MOCK_IMAGE: EvidenceImage = {
  id: 'IMG-20250918-0099',
  facetName: 'Test Crop — Low Quality Sample',
  filename: 'damaged_rice_label_crop.jpg',
  fileSize: '112 KB',
  dimensions: '320 × 240 px',
  format: 'image/jpeg (24-bit RGB)',
  previewUrl: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=400&q=60',
  qualityScore: 0.42,
  isQualityAcceptable: false,
  qualityIssues: [
    'Low resolution (320 × 240 px, recommended minimum 1200 px for packaging text).',
    'Possible optical blur (Laplacian variance score 38.4 indicates significant blur).',
    'Uneven lighting / glare detected across statutory text region.'
  ],
  ocrStatus: 'PENDING',
  detectedFieldsCount: 0,
  rawLines: [],
  extractedFields: []
};

export const MOCK_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'p1', name: 'Image Validation', description: 'MIME validation, format integrity and EXIF orientation verification.', status: 'COMPLETED' },
  { id: 'p2', name: 'Image Preprocessing', description: 'Resolution normalization (max 2400px), contrast enhancement and sharpening.', status: 'COMPLETED' },
  { id: 'p3', name: 'Text Detection', description: 'Deep neural network (PP-OCRv5/DBNet) identifying polygonal text boundaries.', status: 'COMPLETED' },
  { id: 'p4', name: 'Text Recognition', description: 'English & Devanagari sequence recognition models decoding characters.', status: 'COMPLETED' },
  { id: 'p5', name: 'Declaration Extraction', description: 'Deterministic regex matching for Legal Metrology Packaged Commodities rules.', status: 'COMPLETED' },
  { id: 'p6', name: 'Compliance Preparation', description: 'Normalizing axis-aligned bounding boxes [x, y, w, h] and confidence scoring.', status: 'COMPLETED' }
];
