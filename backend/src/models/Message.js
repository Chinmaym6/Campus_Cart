import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class Message extends Model {
    // Instance methods
    async markAsRead() {
        if (!this.read_at) {
            return await this.update({ read_at: new Date() });
        }
        return this;
    }

    isRead() {
        return !!this.read_at;
    }

    async getSender() {
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.sender_id);
    }

    async getRecipient() {
        const { default: User } = await import('./User.js');
        return await User.findByPk(this.recipient_id);
    }

    // Static methods
    static async getConversation(userId1, userId2, options = {}) {
        const { limit = 50, offset = 0 } = options;
        
        return await Message.findAll({
            where: {
                [DataTypes.Op.or]: [
                    { sender_id: userId1, recipient_id: userId2 },
                    { sender_id: userId2, recipient_id: userId1 }
                ]
            },
            order: [['created_at', 'ASC']],
            limit,
            offset
        });
    }

    static async markConversationAsRead(senderId, recipientId) {
        return await Message.update(
            { read_at: new Date() },
            {
                where: {
                    sender_id: senderId,
                    recipient_id: recipientId,
                    read_at: null
                }
            }
        );
    }
}

Message.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    recipient_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 2000]
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
    roommate_post_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'roommate_posts',
            key: 'id'
        }
    },
    read_at: {
        type: DataTypes.DATE,
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
    modelName: 'Message',
    tableName: 'messages',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            fields: ['sender_id']
        },
        {
            fields: ['recipient_id']
        },
        {
            fields: ['item_id']
        },
        {
            fields: ['roommate_post_id']
        },
        {
            fields: ['read_at']
        },
        {
            fields: ['created_at']
        },
        {
            name: 'messages_conversation_idx',
            fields: ['sender_id', 'recipient_id']
        }
    ]
});

export default Message;
