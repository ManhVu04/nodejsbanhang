import { useEffect, useState } from 'react';
import { Row, Col, Card, Empty, Typography, Button, message, Spin } from 'antd';
import { HeartOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

const { Title } = Typography;

export default function WishlistPage() {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWishlist = async () => {
        setLoading(true);
        try {
            let response = await api.get('/wishlists');
            setWishlist(Array.isArray(response.data?.wishlist) ? response.data.wishlist : []);
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the tai wishlist');
            setWishlist([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, []);

    const handleRemove = async (productId) => {
        try {
            await api.delete(`/wishlists/${productId}`);
            message.success('Da xoa khoi wishlist');
            fetchWishlist();
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the xoa san pham');
        }
    };

    return (
        <section className="page-container" aria-label="Wishlist">
            <Title level={3}>Yeu thich cua toi</Title>
            <Spin spinning={loading}>
                {wishlist.length === 0 && !loading ? (
                    <Card className="surface-card" style={{ textAlign: 'center', borderRadius: 12, padding: 40 }}>
                        <Empty description="Wishlist dang trong" />
                        <Link to="/products">
                            <Button type="primary" icon={<ShoppingOutlined />} style={{ marginTop: 12 }}>
                                Kham pha san pham
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <Row gutter={[16, 16]}>
                        {wishlist.map((product) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={product._id}>
                                <div style={{ position: 'relative' }}>
                                    <ProductCard product={product} />
                                    <Button
                                        danger
                                        size="small"
                                        icon={<HeartOutlined />}
                                        onClick={() => handleRemove(product._id)}
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            borderRadius: 999
                                        }}
                                    >
                                        Xoa
                                    </Button>
                                </div>
                            </Col>
                        ))}
                    </Row>
                )}
            </Spin>
        </section>
    );
}
