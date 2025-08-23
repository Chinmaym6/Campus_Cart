import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class Category extends Model {
    // Instance methods
    async getSubcategories() {
        return await Category.findAll({
            where: { parent_id: this.id, is_active: true },
            order: [['sort_order', 'ASC'], ['name', 'ASC']]
        });
    }

    async getItemCount() {
        const { default: Item } = await import('./Item.js');
        return await Item.count({
            where: { 
                category_id: this.id, 
                status: 'available' 
            }
        });
    }

    // Static methods
    static async getMainCategories() {
        return await Category.findAll({
            where: { 
                parent_id: null, 
                is_active: true 
            },
            order: [['sort_order', 'ASC'], ['name', 'ASC']],
            include: [{
                model: Category,
                as: 'subcategories',
                where: { is_active: true },
                required: false
            }]
        });
    }
}

Category.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 100]
        }
    },
    slug: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
        validate: {
            is: /^[a-z0-9-]+$/i
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'categories',
            key: 'id'
        }
    },
    icon_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            isUrl: true
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        validate: {
            is: /^#[0-9A-F]{6}$/i
        }
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
    modelName: 'Category',
    tableName: 'categories',
    underscored: true,
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            unique: true,
            fields: ['slug']
        },
        {
            fields: ['parent_id']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['sort_order']
        }
    ]
});

// Self-referencing association
Category.hasMany(Category, { 
    as: 'subcategories', 
    foreignKey: 'parent_id' 
});
Category.belongsTo(Category, { 
    as: 'parent', 
    foreignKey: 'parent_id' 
});

export default Category;
