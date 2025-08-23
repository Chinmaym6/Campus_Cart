import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class Transaction extends Model {
    // Instance methods
    async getBuyer() {
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.buyer_id);
    }

    async getSeller() {
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.seller_id);
    }

    async getItem() {
        const { default: Item } = await import('./Item.js');
        return await Item.findByPk(this.item_id);
    }

    async complete() {
        return await this.update({
            status: 'completed',
            completed_at: new Date()
        });
    }

    async cancel(reason = null) {
        return await this.update({
            status: 'cancelled',
            cancelled_at: new Date(),
            cancellation_reason: reason
        });
    }

    // Static methods
    static async getUserTransactions(userId, options = {}) {
        const { status, type = 'both', limit = 50 } = options;
        
        let where = {};
        if (status) where.status = status;

        if (type === 'purchases') {
            where.buyer_id = userId;
        } else if (type === 'sales') {
            where.seller_id = userId;
        } else {
            where[DataTypes.Op.or] = [
                { buyer_id: userId },
                { seller_id: userId }
            ];
        }

        return await Transaction.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit
        });
    }
}

Transaction.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'items',
            key: 'id'
        }
    },
    buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    seller_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed'),
        defaultValue: 'pending',
        allowNull: false
    },
    payment_method: {
        type: DataTypes.ENUM('cash', 'venmo', 'paypal', 'zelle', 'other'),
        allowNull: true
    },
    meeting_location: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    meeting_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
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
    modelName: 'Transaction',
    tableName: 'transactions',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            fields: ['item_id']
        },
        {
            fields: ['buyer_id']
        },
        {
            fields: ['seller_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_at']
        }
    ]
});

export default Transaction;
