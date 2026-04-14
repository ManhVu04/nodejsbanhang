import { Button, Row, Col, Card, Typography } from 'antd';
import { ShoppingOutlined, ThunderboltOutlined, SafetyCertificateOutlined, RocketOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api, { resolveImageUrl } from '../utils/api';
import ProductCard from '../components/ProductCard';

const { Title, Paragraph } = Typography;

export default function HomePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        api.get('/products')
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : [];
                setProducts(list.slice(0, 8));
            })
            .catch(() => {});

        api.get('/categories')
            .then((res) => {
                setCategories(Array.isArray(res.data) ? res.data : []);
            })
            .catch(() => {});
    }, []);

    const features = [
        {
            icon: <ThunderboltOutlined />,
            title: 'Đặt hàng trong vài giây',
            desc: 'Giao diện tối ưu, thanh toán nhanh gọn trên mọi thiết bị.',
            accent: '#c0852f'
        },
        {
            icon: <SafetyCertificateOutlined />,
            title: 'Mua sắm an toàn',
            desc: 'Thông tin cá nhân được bảo mật, thanh toán qua cổng uy tín.',
            accent: '#0f766e'
        },
        {
            icon: <RocketOutlined />,
            title: 'Giao hàng nhanh',
            desc: 'Theo dõi đơn hàng real-time, nhận hàng trong 24h nội thành.',
            accent: '#14213d'
        },
        {
            icon: <ShoppingOutlined />,
            title: 'Ưu đãi hấp dẫn',
            desc: 'Voucher giảm giá hàng tuần, chương trình tích điểm cho khách quen.',
            accent: '#b45309'
        }
    ];

    return (
        <div className="home-page">
            <section className="home-hero">
                <div className="page-container home-hero__inner">
                    <div className="home-hero__content">
                        <span className="home-hero__eyebrow">MINISHOP COMMERCE</span>
                        <Title level={1} className="home-hero__title">
                            Mua sắm online theo cách gọn gàng và đáng tin cậy
                        </Title>
                        <Paragraph className="home-hero__subtitle">
                            Hàng ngàn sản phẩm chất lượng, giao hàng nhanh, thanh toán an toàn. Đặt hàng chỉ trong vài giây — quay lại dễ dàng mỗi ngày.
                        </Paragraph>
                        <div className="home-hero__actions">
                            <Link to="/products">
                                <Button type="primary" size="large" icon={<ShoppingOutlined />} className="home-hero__cta home-hero__cta--primary">
                                    Xem sản phẩm
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button size="large" className="home-hero__cta home-hero__cta--ghost">
                                    Tạo tài khoản
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <Card className="surface-card home-hero__panel" bodyStyle={{ padding: 24 }}>
                        <div className="home-hero__kpis">
                            <div>
                                <p className="home-hero__kpi-value">24h</p>
                                <p className="home-hero__kpi-label">giao nhanh nội thành</p>
                            </div>
                            <div>
                                <p className="home-hero__kpi-value">100%</p>
                                <p className="home-hero__kpi-label">thanh toán an toàn</p>
                            </div>
                            <div>
                                <p className="home-hero__kpi-value">0đ</p>
                                <p className="home-hero__kpi-label">phí vận chuyển</p>
                            </div>
                        </div>

                        <div className="home-hero__bullet-list" role="list" aria-label="Loi ich khach hang">
                            <div role="listitem">Đăng nhập nhanh bằng Google hoặc email.</div>
                            <div role="listitem">Lưu giỏ hàng và wishlist trên mọi thiết bị.</div>
                            <div role="listitem">Theo dõi đơn hàng real-time, hoàn trả dễ dàng.</div>
                        </div>
                    </Card>
                </div>
            </section>

            <section className="page-container shop-section" aria-label="Ly do chon minishop">
                <div className="section-heading">
                    <Title level={3}>Vì sao chọn Minishop?</Title>
                    <Paragraph>
                        Mọi trải nghiệm đều được tối ưu để bạn mua sắm nhanh hơn, yên tâm hơn và luôn muốn quay lại.
                    </Paragraph>
                </div>
                <Row gutter={[18, 18]}>
                    {features.map((feature) => (
                        <Col xs={24} sm={12} md={6} key={feature.title}>
                            <Card
                                className="surface-card home-feature"
                                bodyStyle={{ padding: 20 }}
                                style={{ '--feature-accent': feature.accent }}
                            >
                                <span className="home-feature__icon">{feature.icon}</span>
                                <Title level={5}>{feature.title}</Title>
                                <Paragraph>{feature.desc}</Paragraph>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </section>

            {categories.length > 0 && (
                <section className="page-container shop-section" aria-label="Danh mục sản phẩm">
                    <div className="section-heading section-heading--inline">
                        <Title level={3}>Danh mục sản phẩm</Title>
                        <Link to="/products" className="text-link">Xem tất cả danh mục</Link>
                    </div>
                    <Row gutter={[16, 16]}>
                        {categories.filter((categoryItem) => !categoryItem.isDeleted).slice(0, 6).map((categoryItem) => (
                            <Col xs={12} sm={8} md={4} key={categoryItem._id}>
                                <Link to={`/products?category=${categoryItem._id}`}>
                                    <Card hoverable className="surface-card category-pill" bodyStyle={{ padding: 14 }}>
                                        <img
                                            src={resolveImageUrl(categoryItem.image)}
                                            alt={categoryItem.name}
                                            className="category-pill__image"
                                        />
                                        <div className="category-pill__name">{categoryItem.name}</div>
                                    </Card>
                                </Link>
                            </Col>
                        ))}
                    </Row>
                </section>
            )}

            {products.length > 0 && (
                <section className="page-container shop-section" aria-label="Sản phẩm nổi bật">
                    <div className="section-heading section-heading--inline">
                        <Title level={3}>Sản phẩm nổi bật</Title>
                        <Link to="/products" className="text-link">Xem toàn bộ</Link>
                    </div>
                    <Row gutter={[16, 16]}>
                        {products.map((product) => (
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
