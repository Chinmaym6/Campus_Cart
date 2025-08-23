// Application wide constants

export const USER_ROLES = {
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin'
};

export const ITEM_CONDITIONS = [
    'new',
    'like_new', 
    'good',
    'fair',
    'poor'
];

export const ITEM_STATUSES = [
    'available',
    'reserved',
    'sold',
    'inactive'
];

export const ROOMMATE_STATUSES = [
    'looking',
    'matched', 
    'inactive'
];

export const USER_STATUSES = [
    'pending_verification',
    'active',
    'suspended',
    'inactive'
];

export const NOTIFICATION_TYPES = {
    MESSAGE: 'message',
    ITEM_SAVED: 'item_saved',
    ITEM_SOLD: 'item_sold',
    REVIEW_RECEIVED: 'review_received',
    ROOMMATE_MATCH: 'roommate_match',
    SYSTEM: 'system',
    VERIFICATION: 'verification'
};

export const REPORT_TYPES = [
    'inappropriate_content',
    'spam',
    'harassment', 
    'fake_listing',
    'fraud',
    'scam',
    'other'
];

export const HOUSING_TYPES = [
    'dorm',
    'apartment',
    'house',
    'studio'
];

export const PREFERRED_LOCATIONS = [
    'on_campus',
    'near_campus',
    'downtown',
    'suburbs',
    'anywhere'
];

export const GENDER_PREFERENCES = [
    'male',
    'female',
    'any',
    'non_binary'
];

export const PAYMENT_METHODS = [
    'cash',
    'venmo',
    'paypal',
    'zelle',
    'cashapp',
    'other'
];

export const MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    OFFER: 'offer',
    SYSTEM: 'system'
};

export const TRANSACTION_STATUSES = [
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'disputed'
];

// File upload constraints
export const FILE_CONSTRAINTS = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_DOC_TYPES: ['application/pdf']
};

// Pagination defaults
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
};

// Rate limiting
export const RATE_LIMITS = {
    AUTH: { windowMs: 15 * 60 * 1000, max: 5 },
    REGISTRATION: { windowMs: 60 * 60 * 1000, max: 3 },
    API: { windowMs: 15 * 60 * 1000, max: 1000 },
    UPLOAD: { windowMs: 60 * 60 * 1000, max: 50 },
    MESSAGE: { windowMs: 60 * 1000, max: 10 }
};

export default {
    USER_ROLES,
    ITEM_CONDITIONS,
    ITEM_STATUSES,
    ROOMMATE_STATUSES,
    USER_STATUSES,
    NOTIFICATION_TYPES,
    REPORT_TYPES,
    HOUSING_TYPES,
    PREFERRED_LOCATIONS,
    GENDER_PREFERENCES,
    PAYMENT_METHODS,
    MESSAGE_TYPES,
    TRANSACTION_STATUSES,
    FILE_CONSTRAINTS,
    PAGINATION,
    RATE_LIMITS
};
