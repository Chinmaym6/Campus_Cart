import Joi from 'joi';

// User validation schemas
export const registrationSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, uppercase letter, number, and special character',
        'any.required': 'Password is required'
    }),
    firstName: Joi.string().min(1).max(50).required().messages({
        'string.min': 'First name is required',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
    }),
    lastName: Joi.string().min(1).max(50).required().messages({
        'string.min': 'Last name is required', 
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
    }),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().messages({
        'string.pattern.base': 'Please provide a valid phone number'
    }),
    universityId: Joi.string().guid({ version: 'uuidv4' }).optional(),
    studentId: Joi.string().max(50).optional(),
    graduationYear: Joi.number().integer().min(2020).max(2035).optional().messages({
        'number.min': 'Graduation year must be 2020 or later',
        'number.max': 'Graduation year must be 2035 or earlier'
    }),
    bio: Joi.string().max(500).optional().messages({
        'string.max': 'Bio cannot exceed 500 characters'
    })
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    })
});

export const updateProfileSchema = Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow(null).optional(),
    bio: Joi.string().max(500).allow('').optional(),
    studentId: Joi.string().max(50).allow('').optional(),
    graduationYear: Joi.number().integer().min(2020).max(2035).allow(null).optional(),
    locationAddress: Joi.string().max(255).allow('').optional(),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional()
});

// Item validation schemas
export const itemSchema = Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
        'string.min': 'Title is required',
        'string.max': 'Title cannot exceed 255 characters',
        'any.required': 'Title is required'
    }),
    description: Joi.string().min(10).max(2000).required().messages({
        'string.min': 'Description must be at least 10 characters',
        'string.max': 'Description cannot exceed 2000 characters',
        'any.required': 'Description is required'
    }),
    price: Joi.number().positive().precision(2).required().messages({
        'number.positive': 'Price must be a positive number',
        'any.required': 'Price is required'
    }),
    categoryId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.guid': 'Please select a valid category',
        'any.required': 'Category is required'
    }),
    condition: Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor').required().messages({
        'any.only': 'Please select a valid condition',
        'any.required': 'Condition is required'
    }),
    isbn: Joi.string().max(20).optional().allow(''),
    brand: Joi.string().max(100).optional().allow(''),
    model: Joi.string().max(100).optional().allow(''),
    locationAddress: Joi.string().max(500).optional().allow(''),
    latitude: Joi.number().min(-90).max(90).optional().allow(null),
    longitude: Joi.number().min(-180).max(180).optional().allow(null),
    isNegotiable: Joi.boolean().optional().default(true)
});

export const updateItemSchema = Joi.object({
    title: Joi.string().min(1).max(255).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    price: Joi.number().positive().precision(2).optional(),
    condition: Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor').optional(),
    isbn: Joi.string().max(20).optional().allow(''),
    brand: Joi.string().max(100).optional().allow(''),
    model: Joi.string().max(100).optional().allow(''),
    locationAddress: Joi.string().max(500).optional().allow(''),
    latitude: Joi.number().min(-90).max(90).optional().allow(null),
    longitude: Joi.number().min(-180).max(180).optional().allow(null),
    isNegotiable: Joi.boolean().optional()
});

// Message validation schemas
export const messageSchema = Joi.object({
    content: Joi.string().min(1).max(2000).required().messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 2000 characters',
        'any.required': 'Message content is required'
    }),
    recipientId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.guid': 'Invalid recipient',
        'any.required': 'Recipient is required'
    }),
    itemId: Joi.string().guid({ version: 'uuidv4' }).optional(),
    roommatePostId: Joi.string().guid({ version: 'uuidv4' }).optional()
});

// Roommate post validation schemas
export const roommatePostSchema = Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
        'string.min': 'Title is required',
        'string.max': 'Title cannot exceed 255 characters',
        'any.required': 'Title is required'
    }),
    description: Joi.string().min(10).max(1000).required().messages({
        'string.min': 'Description must be at least 10 characters',
        'string.max': 'Description cannot exceed 1000 characters',
        'any.required': 'Description is required'
    }),
    budgetMin: Joi.number().positive().required().messages({
        'number.positive': 'Minimum budget must be positive',
        'any.required': 'Minimum budget is required'
    }),
    budgetMax: Joi.number().positive().greater(Joi.ref('budgetMin')).required().messages({
        'number.positive': 'Maximum budget must be positive',
        'number.greater': 'Maximum budget must be greater than minimum budget',
        'any.required': 'Maximum budget is required'
    }),
    housingType: Joi.string().valid('dorm', 'apartment', 'house', 'studio').required(),
    preferredLocation: Joi.string().valid('on_campus', 'near_campus', 'downtown', 'suburbs', 'anywhere').required(),
    moveInDate: Joi.date().optional().allow(null),
    leaseDurationMonths: Joi.number().integer().min(1).max(24).optional().allow(null),
    genderPreference: Joi.string().valid('male', 'female', 'any', 'non_binary').optional().default('any'),
    agePreference: Joi.string().max(20).optional().allow(''),
    locationAddress: Joi.string().max(500).optional().allow(''),
    latitude: Joi.number().min(-90).max(90).optional().allow(null),
    longitude: Joi.number().min(-180).max(180).optional().allow(null),
    cleanlinessLevel: Joi.number().integer().min(1).max(5).optional(),
    noiseTolerance: Joi.number().integer().min(1).max(5).optional(),
    guestPolicy: Joi.string().valid('never', 'rarely', 'sometimes', 'often', 'always').optional(),
    sleepSchedule: Joi.string().valid('early_bird', 'normal', 'night_owl').optional(),
    studyHabits: Joi.string().valid('library', 'home_quiet', 'home_music', 'anywhere').optional(),
    socialLevel: Joi.number().integer().min(1).max(5).optional(),
    smokingAllowed: Joi.boolean().optional().default(false),
    petsAllowed: Joi.boolean().optional().default(false),
    alcoholFriendly: Joi.boolean().optional().default(true)
});

// Review validation schemas
export const reviewSchema = Joi.object({
    revieweeId: Joi.string().guid({ version: 'uuidv4' }).required(),
    itemId: Joi.string().guid({ version: 'uuidv4' }).optional(),
    rating: Joi.number().integer().min(1).max(5).required().messages({
        'number.min': 'Rating must be between 1 and 5',
        'number.max': 'Rating must be between 1 and 5',
        'any.required': 'Rating is required'
    }),
    comment: Joi.string().max(1000).optional().allow('').messages({
        'string.max': 'Comment cannot exceed 1000 characters'
    }),
    isPublic: Joi.boolean().optional().default(true)
});

// Report validation schemas
export const reportSchema = Joi.object({
    type: Joi.string().valid(
        'inappropriate_content',
        'spam', 
        'harassment',
        'fake_listing',
        'fraud',
        'scam',
        'other'
    ).required(),
    description: Joi.string().min(10).max(1000).required().messages({
        'string.min': 'Please provide a detailed description (at least 10 characters)',
        'string.max': 'Description cannot exceed 1000 characters',
        'any.required': 'Description is required'
    }),
    reportedUserId: Joi.string().guid({ version: 'uuidv4' }).optional(),
    reportedItemId: Joi.string().guid({ version: 'uuidv4' }).optional(),
    reportedMessageId: Joi.string().guid({ version: 'uuidv4' }).optional()
});

// Search validation schemas
export const searchSchema = Joi.object({
    q: Joi.string().max(100).optional().allow(''),
    category: Joi.string().max(50).optional(),
    categoryId: Joi.string().guid({ version: 'uuidv4' }).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().positive().optional(),
    condition: Joi.alternatives().try(
        Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor'),
        Joi.array().items(Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor'))
    ).optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().positive().max(100).optional(),
    universityId: Joi.string().guid({ version: 'uuidv4' }).optional(),
    sort: Joi.string().valid('newest', 'oldest', 'price_low', 'price_high', 'popular', 'ending_soon').optional().default('newest'),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20)
});

// Password validation schemas
export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required'
    }),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one lowercase letter, uppercase letter, number, and special character',
        'any.required': 'New password is required'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Password confirmation does not match',
        'any.required': 'Password confirmation is required'
    })
});

export const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, uppercase letter, number, and special character',
        'any.required': 'Password is required'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Password confirmation does not match',
        'any.required': 'Password confirmation is required'
    })
});

// Email validation
export const emailSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    })
});

// Validation middleware
export const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        next();
    };
};

export default {
    registrationSchema,
    loginSchema,
    updateProfileSchema,
    itemSchema,
    updateItemSchema,
    messageSchema,
    roommatePostSchema,
    reviewSchema,
    reportSchema,
    searchSchema,
    changePasswordSchema,
    resetPasswordSchema,
    emailSchema,
    validate
};
