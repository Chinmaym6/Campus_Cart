import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class Review extends Model {
    // Instance methods
    async getReviewer() {
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.reviewer_id);
    }

    async getReviewee() {
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.reviewee_id);
    }

    async getItem() {
        if (!this.item_id) return null;
        const { default: Item } = await import('./Item.js');
        return await Item.findByPk(this.item_id);
    }

    // Static methods
    static async getAverageRating(userId) {
        const result = await Review.findOne({
            where: { reviewee_id: userId, is_public: true },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
            ],
            raw: true
        });

        return {
            averageRating: result.average_rating ? parseFloat(result.average_rating) : null,
            totalReviews: parseInt(result.total_reviews) || 0
        };
    }

    static async getRatingDistribution(userId) {
        const ratings = await Review.findAll({
            where: { reviewee_id: userId, is_public: true },
            attributes: [
                'rating',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['rating'],
            order: [['rating', 'DESC']],
            raw: true
        });

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratings.forEach(r => {
            distribution[r.rating] = parseInt(r.count);
        });

        return distribution;
    }
}

Review.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    reviewer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    reviewee_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    item_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'items',
            key: 'id'
        }
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5,
            isInt: true
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: [0, 1000]
        }
    },
    is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
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
    modelName: 'Review',
    tableName: 'reviews',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            fields: ['reviewer_id']
        },
        {
            fields: ['reviewee_id']
        },
        {
            fields: ['item_id']
        },
        {
            fields: ['rating']
        },
        {
            fields: ['is_public']
        },
        {
            unique: true,
            fields: ['reviewer_id', 'reviewee_id', 'item_id'],
            name: 'unique_review_per_transaction'
        }
    ]
});

export default Review;
