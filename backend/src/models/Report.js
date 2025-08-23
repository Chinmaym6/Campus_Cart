import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class Report extends Model {
    // Instance methods
    async getReporter() {
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.reporter_id);
    }

    async getReportedUser() {
        if (!this.reported_user_id) return null;
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.reported_user_id);
    }

    async getReportedItem() {
        if (!this.reported_item_id) return null;
        const { default: Item } = await import('./Item.js');
        return await Item.findByPk(this.reported_item_id);
    }

    async resolve(adminId, action = null, notes = null) {
        return await this.update({
            status: 'resolved',
            resolved_by: adminId,
            resolved_at: new Date(),
            admin_action: action,
            admin_notes: notes
        });
    }

    async dismiss(adminId, notes = null) {
        return await this.update({
            status: 'dismissed',
            resolved_by: adminId,
            resolved_at: new Date(),
            admin_notes: notes
        });
    }

    // Static methods
    static async getPendingReports() {
        return await Report.findAll({
            where: { status: 'pending' },
            order: [['created_at', 'ASC']]
        });
    }

    static async getReportStats() {
        const stats = await Report.findOne({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'pending\' THEN 1 END')), 'pending'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'resolved\' THEN 1 END')), 'resolved'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'dismissed\' THEN 1 END')), 'dismissed']
            ],
            raw: true
        });

        return {
            total: parseInt(stats.total) || 0,
            pending: parseInt(stats.pending) || 0,
            resolved: parseInt(stats.resolved) || 0,
            dismissed: parseInt(stats.dismissed) || 0
        };
    }
}

Report.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    reporter_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    reported_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    reported_item_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'items',
            key: 'id'
        }
    },
    reported_message_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'messages',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.ENUM(
            'inappropriate_content',
            'spam',
            'harassment',
            'fake_listing',
            'fraud',
            'other'
        ),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [10, 1000]
        }
    },
    evidence: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'resolved', 'dismissed'),
        defaultValue: 'pending',
        allowNull: false
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false
    },
    resolved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    resolved_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    admin_action: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    admin_notes: {
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
    modelName: 'Report',
    tableName: 'reports',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            fields: ['reporter_id']
        },
        {
            fields: ['reported_user_id']
        },
        {
            fields: ['reported_item_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['type']
        },
        {
            fields: ['priority']
        },
        {
            fields: ['created_at']
        }
    ]
});

export default Report;
