import { Button, Row, Col, Card, Typography } from 'antd';
import { ShoppingOutlined, ThunderboltOutlined, SafetyCertificateOutlined, RocketOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

const { Title, Paragraph } = Typography;

export default function HomePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        api.get('/products').then(res => setProducts(res.data?.slice?.(0, 8) || [])).catch(() => {});
        api.get('/categories').then(res => setCategories(res.data || [])).catch(() => {});
    }, []);

    const features = [
        { icon: <ThunderboltOutlined style={{ fontSize: 36, color: '#667eea' }} />, title: 'Nhanh chóng', desc: 'Đặt hàng chỉ với vài cú click' },
        { icon: <SafetyCertificateOutlined style={{ fontSize: 36, color: '#764ba2' }} />, title: 'An toàn', desc: 'Thanh toán bảo mật với VNPay' },
        { icon: <RocketOutlined style={{ fontSize: 36, color: '#e74c3c' }} />, title: 'Giao nhanh', desc: 'Giao hàng siêu tốc toàn quốc' },
        { icon: <ShoppingOutlined style={{ fontSize: 36, color: '#27ae60' }} />, title: 'Đa dạng', desc: 'Hàng ngàn sản phẩm chất lượng' }
    ];

    return (
        <div>
            <section className="home-hero">
                <Title level={1} className="home-hero__title" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}>
                    🛒 MiniShop E-commerce
                </Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.88)', fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', maxWidth: 680, margin: '0 auto 28px' }}>
                    Nền tảng thương mại điện tử hiện đại, bảo mật, trải nghiệm mua sắm tuyệt vời
                </Paragraph>
                <Link to="/products">
                    <Button type="primary" size="large" icon={<ShoppingOutlined />}
                        className="home-hero__cta"
                        style={{ height: 50, paddingInline: 40, borderRadius: 28, fontSize: 16, fontWeight: 700, background: '#fff', color: '#111', border: '1px solid #e5e7eb', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                        Khám phá ngay
                    </Button>
                </Link>
            </section>

            <section className="page-container shop-section">
                <Row gutter={[24, 24]}>
                    {features.map((f, i) => (
                        <Col xs={24} sm={12} md={6} key={i}>
                            <Card className="surface-card" style={{ textAlign: 'center', borderRadius: 14 }} bodyStyle={{ padding: 24 }}>
                                <div style={{ marginBottom: 12 }}>{f.icon}</div>
                                <Title level={5} style={{ margin: '0 0 4px' }}>{f.title}</Title>
                                <Paragraph type="secondary" style={{ margin: 0 }}>{f.desc}</Paragraph>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </section>

            {categories.length > 0 && (
                <section className="page-container shop-section" aria-label="Danh mục sản phẩm">
                    <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>📂 Danh mục sản phẩm</Title>
                    <Row gutter={[16, 16]} justify="center">
                        {categories.filter(c => !c.isDeleted).slice(0, 6).map(cat => (
                            <Col key={cat._id}>
                                <Link to={`/products?category=${cat._id}`}>
                                    <Card hoverable className="surface-card" style={{ borderRadius: 12, textAlign: 'center', minWidth: 140 }} bodyStyle={{ padding: '16px 24px' }}>
                                        <img src={cat.image} alt={cat.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                                        <div style={{ fontWeight: 600 }}>{cat.name}</div>
                                    </Card>
                                </Link>
                            </Col>
                        ))}
                    </Row>
                </section>
            )}

            {products.length > 0 && (
                <section className="page-container shop-section" aria-label="Sản phẩm nổi bật">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ margin: 0 }}>🔥 Sản phẩm nổi bật</Title>
                        <Link to="/products">Xem tất cả →</Link>
                    </div>
                    <Row gutter={[16, 16]}>
                        {products.map(product => (
                            <Col xs={24} sm={12} md={8} lg={6} key={product._id}>
                                <ProductCard product={product} />
                            </Col>
                        ))}
                    </Row>
                </section>
            )}
        </div>
    );
}
