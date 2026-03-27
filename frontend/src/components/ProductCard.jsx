import { Card, Tag, Button, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';

export default function ProductCard({ product }) {
    const dispatch = useDispatch();

    const handleAddToCart = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await dispatch(addToCart({ productId: product._id })).unwrap();
            message.success('Đã thêm vào giỏ hàng');
        } catch (err) {
            message.error(err || 'Thêm thất bại');
        }
    };

    const imageUrl = product.images?.[0] || 'https://i.imgur.com/cHddUCu.jpeg';

    return (
        <Link to={`/products/${product._id}`}>
            <Card
                hoverable
                className="surface-card product-card"
                cover={
                    <div className="product-card__media">
                        <img
                            alt={product.title}
                            src={imageUrl}
                            className="product-card__image"
                            loading="lazy"
                        />
                    </div>
                }
                bodyStyle={{ padding: '12px 16px' }}
            >
                <div style={{ marginBottom: 4 }}>
                    {product.category?.name && (
                        <Tag color="default" style={{ fontSize: 11 }}>{product.category.name}</Tag>
                    )}
                </div>
                <h3 className="product-card__title">
                    {product.title}
                </h3>
                <div className="product-card__footer">
                    <span className="product-card__price">
                        {product.price?.toLocaleString('vi-VN')}đ
                    </span>
                    <Button
                        type="primary" size="small"
                        icon={<ShoppingCartOutlined />}
                        onClick={handleAddToCart}
                        aria-label={`Thêm ${product.title} vào giỏ`}
                    />
                </div>
            </Card>
        </Link>
    );
}
