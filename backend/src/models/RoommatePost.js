import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class RoommatePost extends Model {
    // Instance methods
    async incrementViews() {
        return await this.increment('view_count');
    }

    async getUser() {
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.user_id);
    }

    isActive() {
        return this.status === 'looking' && new Date() < this.expires_at;
    }

    // Static methods
    static async getActivePostsNearLocation(latitude, longitude, radiusKm = 50) {
        const query = `
            SELECT *, 
                   (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(:lng)) + 
                    sin(radians(:lat)) * sin(radians(latitude)))) AS distance
            FROM roommate_posts
            WHERE status = 'looking' 
            AND expires_at > NOW()
            AND latitude IS NOT NULL 
            AND longitude IS NOT NULL
            HAVING distance <= :radius
            ORDER BY distance ASC
        `;

        return await sequelize.query(query, {
            replacements: { 
                lat: latitude, 
                lng: longitude, 
                radius: radiusKm 
            },
            type: sequelize.QueryTypes.SELECT
        });
    }

    static async getCompatibilityScore(post1Id, post2Id) {
        const posts = await RoommatePost.findAll({
            where: { id: [post1Id, post2Id] }
        });

        if (posts.length !== 2) return 0;

        const [p1, p2] = posts;
        let score = 0;
        let factors = 0;

        // Budget compatibility
        if (p1.budget_min <= p2.budget_max && p1.budget_max >= p2.budget_min) {
            score += 20;
        }
        factors++;

        // Location preference
        if (p1.preferred_location === p2.preferred_location) {
            score += 15;
        }
        factors++;

        // Housing type
        if (p1.housing_type === p2.housing_type) {
            score += 10;
        }
        factors++;

        // Lifestyle preferences
        if (Math.abs(p1.cleanliness_level - p2.cleanliness_level) <= 1) {
            score += 10;
        }
        if (Math.abs(p1.noise_tolerance - p2.noise_tolerance) <= 1) {
            score += 10;
        }
        if (Math.abs(p1.social_level - p2.social_level) <= 1) {
            score += 10;
        }

        return Math.round(score / factors * 5); // Scale to 100
    }
}

RoommatePost.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [10, 1000]
        }
    },
    budget_min: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    budget_max: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    housing_type: {
        type: DataTypes.ENUM('dorm', 'apartment', 'house', 'studio'),
        allowNull: false
    },
    preferred_location: {
        type: DataTypes.ENUM('on_campus', 'near_campus', 'downtown', 'suburbs', 'anywhere'),
        allowNull: false
    },
    move_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    lease_duration_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 24
        }
    },
    gender_preference: {
        type: DataTypes.ENUM('male', 'female', 'any', 'non_binary'),
        defaultValue: 'any',
        allowNull: false
    },
    age_preference: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    location_address: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        validate: {
            min: -90,
            max: 90
        }
    },
    longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
        validate: {
            min: -180,
            max: 180
        }
    },
    cleanliness_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    noise_tolerance: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    guest_policy: {
        type: DataTypes.ENUM('never', 'rarely', 'sometimes', 'often', 'always'),
        allowNull: true
    },
    sleep_schedule: {
        type: DataTypes.ENUM('early_bird', 'normal', 'night_owl'),
        allowNull: true
    },
    study_habits: {
        type: DataTypes.ENUM('library', 'home_quiet', 'home_music', 'anywhere'),
        allowNull: true
    },
    social_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    smoking_allowed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    pets_allowed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    alcohol_friendly: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    images: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('looking', 'matched', 'inactive'),
        defaultValue: 'looking',
        allowNull: false
    },
    view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'RoommatePost',
    tableName: 'roommate_posts',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['housing_type']
        },
        {
            fields: ['preferred_location']
        },
        {
            fields: ['budget_min', 'budget_max']
        },
        {
            fields: ['expires_at']
        },
        {
            name: 'roommate_posts_location_idx',
            fields: ['latitude', 'longitude']
        }
    ]
});

export default RoommatePost;
