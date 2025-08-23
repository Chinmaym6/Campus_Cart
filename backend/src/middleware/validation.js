import Joi from 'joi';

export const validateRegistration = (req, res, next) => {
    const currentYear = new Date().getFullYear();

    const schema = Joi.object({
        first_name: Joi.string().min(2).max(50).required()
            .messages({
                'string.base': 'First name must be a string',
                'string.empty': 'First name is required',
                'string.min': 'First name must be at least 2 characters',
                'string.max': 'First name cannot exceed 50 characters'
            }),
        last_name: Joi.string().max(50).allow('').optional()
            .messages({
                'string.base': 'Last name must be a string',
                'string.max': 'Last name cannot exceed 50 characters'
            }),
        email: Joi.string().email().required()
            .messages({
                'string.email': 'Email must be a valid email address',
                'string.empty': 'Email is required'
            }),
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
            .required()
            .messages({
                'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
                'string.min': 'Password must be at least 8 characters',
                'string.empty': 'Password is required'
            }),
        phone: Joi.string().allow('').optional()
            .messages({
                'string.base': 'Phone number must be a string'
            }),
        student_id: Joi.string().max(20).allow('').optional()
            .messages({
                'string.max': 'Student ID cannot exceed 20 characters'
            }),
        graduation_year: Joi.number()
            .min(currentYear)
            .max(currentYear + 6)
            .required()
            .messages({
                'number.base': 'Graduation year must be a valid number',
                'number.min': `Graduation year cannot be earlier than ${currentYear}`,
                'number.max': `Graduation year cannot be later than ${currentYear + 6}`
            }),
        bio: Joi.string().max(500).allow('')
            .messages({
                'string.max': 'Bio cannot exceed 500 characters'
            }),
        location_address: Joi.string().max(200).allow('')
            .messages({
                'string.max': 'Location address cannot exceed 200 characters'
            })
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ 
            message: error.details[0].message 
        });
    }
    next();
};

/**
 * Middleware to validate Content-Type header
 * @param {Array} allowedTypes - Array of allowed content types
 * @returns {Function} Express middleware
 */
export const validateContentType = (allowedTypes = ['application/json']) => {
    return (req, res, next) => {
        // Skip validation for GET and DELETE requests as they typically don't have bodies
        if (['GET', 'DELETE'].includes(req.method)) {
            return next();
        }
        
        const contentType = req.headers['content-type'];
        
        // If no content but method requires it
        if (!contentType && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            return res.status(415).json({
                success: false,
                message: 'Content-Type header is required'
            });
        }
        
        // Check if content type is allowed
        const isAllowed = allowedTypes.some(type => contentType?.includes(type));
        
        if (!isAllowed) {
            return res.status(415).json({
                success: false,
                message: `Unsupported Content-Type. Allowed types: ${allowedTypes.join(', ')}`
            });
        }
        
        next();
    };
};

// Generic validation middleware that can be used with any schema
export const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                message: error.details[0].message 
            });
        }
        next();
    };
};

export const validateLogin = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required()
            .messages({
                'string.email': 'Email must be a valid email address',
                'string.empty': 'Email is required'
            }),
        password: Joi.string().required()
            .messages({
                'string.empty': 'Password is required'
            })
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ 
            message: error.details[0].message 
        });
    }
    next();
};

// Add the missing validateItemCreation function
export const validateItemCreation = (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string().min(3).max(100).required()
            .messages({
                'string.base': 'Title must be a string',
                'string.empty': 'Title is required',
                'string.min': 'Title must be at least 3 characters',
                'string.max': 'Title cannot exceed 100 characters'
            }),
        description: Joi.string().min(10).max(1000).required()
            .messages({
                'string.base': 'Description must be a string',
                'string.empty': 'Description is required',
                'string.min': 'Description must be at least 10 characters',
                'string.max': 'Description cannot exceed 1000 characters'
            }),
        price: Joi.number().min(0).max(999999.99).required()
            .messages({
                'number.base': 'Price must be a valid number',
                'number.min': 'Price cannot be negative',
                'number.max': 'Price cannot exceed $999,999.99',
                'any.required': 'Price is required'
            }),
        condition: Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor').required()
            .messages({
                'any.only': 'Condition must be one of: new, like_new, good, fair, poor',
                'any.required': 'Condition is required'
            }),
        category_id: Joi.number().integer().positive().required()
            .messages({
                'number.base': 'Category ID must be a valid number',
                'number.integer': 'Category ID must be an integer',
                'number.positive': 'Category ID must be positive',
                'any.required': 'Category is required'
            }),
        images: Joi.array().items(Joi.string().uri()).max(5).optional()
            .messages({
                'array.base': 'Images must be an array',
                'array.max': 'Cannot upload more than 5 images',
                'string.uri': 'Each image must be a valid URL'
            }),
        location_address: Joi.string().max(200).optional()
            .messages({
                'string.max': 'Location address cannot exceed 200 characters'
            })
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ 
            message: error.details[0].message 
        });
    }
    next();
};
