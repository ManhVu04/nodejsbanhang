import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Typography, Button, Tag, Divider, Spin, message, Image, Card, Breadcrumb, Rate, Input, List, Avatar, Space } from 'antd';
import { ShoppingCartOutlined, HomeOutlined, HeartOutlined, HeartFilled } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import api, { resolveImageUrl } from '../utils/api';
import ProductCard from '../components/ProductCard';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function ProductDetailPage() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [reviewData, setReviewData] = useState({
        reviews: [],
        stats: {
            averageRating: 0,
            reviewCount: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
    });
    const [myRating, setMyRating] = useState(5);
    const [myComment, setMyComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [wishlistUpdating, setWishlistUpdating] = useState(false);
    const [loading, setLoading] = useState(true);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const fetchReviews = useCallback(async () => {
        let reviewRes = await api.get(`/reviews/product/${id}`);
        let payload = reviewRes.data || {};
        let nextReviews = Array.isArray(payload.reviews) ? payload.reviews : [];
        let nextStats = payload.stats || {
            averageRating: 0,
            reviewCount: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };

        setReviewData({ reviews: nextReviews, stats: nextStats });

        if (user?._id) {
            let myReview = nextReviews.find((item) => item.user?._id === user._id);
            if (myReview) {
                setMyRating(myReview.rating || 5);
                setMyComment(myReview.comment || '');
            }
        }
    }, [id, user?._id]);

    useEffect(() => {
        let cancelled = false;

        (async function loadData() {
            try {
                setLoading(true);
                let [prodRes, relatedRes, reviewRes] = await Promise.all([
                    api.get(`/products/${id}`),
                    api.get(`/products/${id}/related`, { params: { limit: 4 } }),
                    api.get(`/reviews/product/${id}`)
                ]);

                if (cancelled) {
                    return;
                }

                setProduct(prodRes.data);
                setRelatedProducts(Array.isArray(relatedRes.data) ? relatedRes.data : []);
                let payload = reviewRes.data || {};
                let nextReviews = Array.isArray(payload.reviews) ? payload.reviews : [];
                let nextStats = payload.stats || {
                    averageRating: 0,
                    reviewCount: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
                setReviewData({ reviews: nextReviews, stats: nextStats });

                if (user?._id) {
                    let myReview = nextReviews.find((item) => item.user?._id === user._id);
                    if (myReview) {
                        setMyRating(myReview.rating || 5);
                        setMyComment(myReview.comment || '');
                    }
                }
            } catch {
                if (!cancelled) {
                    message.error('Khong tim thay san pham');
                    navigate('/products');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, navigate, user?._id]);

    useEffect(() => {
        let cancelled = false;

        if (!user?._id) {
            setIsInWishlist(false);
            return;
        }

        api.get('/wishlists')
            .then((response) => {
                if (cancelled) {
                    return;
                }
                let wishlist = Array.isArray(response.data?.wishlist) ? response.data.wishlist : [];
                setIsInWishlist(wishlist.some((item) => item._id === id));
            })
            .catch(() => {
                if (!cancelled) {
                    setIsInWishlist(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [id, user?._id]);

    const handleAddToCart = async () => {
        try {
            await dispatch(addToCart({ productId: product._id })).unwrap();
            message.success('Đã thêm vào giỏ hàng!');
        } catch (err) {
            message.error(err || 'Thêm thất bại');
        }
    };

    const handleToggleWishlist = async () => {
        if (!user) {
            message.info('Vui long dang nhap de su dung wishlist');
            navigate('/login');
            return;
        }

        try {
            setWishlistUpdating(true);
            let response = await api.post(`/wishlists/${product._id}`);
            setIsInWishlist(Boolean(response.data?.isInWishlist));
            message.success(response.data?.message || 'Cap nhat wishlist thanh cong');
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the cap nhat wishlist');
        } finally {
            setWishlistUpdating(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!user) {
            message.info('Vui long dang nhap de danh gia');
            navigate('/login');
            return;
        }

        try {
            setReviewSubmitting(true);
            await api.post(`/reviews/product/${id}`, {
                rating: myRating,
                comment: myComment
            });
            message.success('Da gui danh gia');
            await fetchReviews();
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the gui danh gia');
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingBlock: 80 }}><Spin size="large" /></div>;
    if (!product) return null;

    const imageUrl = resolveImageUrl(product.images?.[0]);

    return (
        <section className="product-detail" aria-label="Chi tiết sản phẩm">
            <Breadcrumb style={{ marginBottom: 16 }} items={[
                { title: <a onClick={() => navigate('/')}><HomeOutlined /> Trang chủ</a> },
                { title: <a onClick={() => navigate('/products')}>Sản phẩm</a> },
                { title: product.title }
            ]} />

            <Card className="surface-card" style={{ borderRadius: 16, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
                <Row>
                    <Col xs={24} md={12}>
                        <div style={{ padding: 24, background: '#fafafa', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                            <Image
                                src={imageUrl}
                                alt={product.title}
                                style={{ maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
                                preview={{ mask: 'Xem ảnh lớn' }}
                            />
                        </div>
                    </Col>
                    <Col xs={24} md={12}>
                        <div style={{ padding: 32 }}>
                            {product.category?.name && <Tag color="default">{product.category.name}</Tag>}
                            <Title level={2} style={{ marginTop: 8, marginBottom: 8 }}>{product.title}</Title>
                            <Text type="secondary">SKU: {product.sku}</Text>
                            <div style={{ marginTop: 10 }}>
                                <Space>
                                    <Rate allowHalf disabled value={reviewData.stats.averageRating || 0} />
                                    <Text>{reviewData.stats.averageRating || 0} ({reviewData.stats.reviewCount || 0} danh gia)</Text>
                                </Space>
                            </div>

                            <Divider />

                            <Title level={2} style={{ color: '#e74c3c', margin: '0 0 16px' }}>
                                {product.price?.toLocaleString('vi-VN')}đ
                            </Title>

                            <Paragraph style={{ fontSize: 15, color: '#555', lineHeight: 1.8 }}>
                                {product.description || 'Chưa có mô tả sản phẩm.'}
                            </Paragraph>

                            <Divider />

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <Button type="primary" size="large" icon={<ShoppingCartOutlined />}
                                    onClick={handleAddToCart}
                                    style={{
                                        height: 50, paddingInline: 32, borderRadius: 10, fontWeight: 700,
                                        fontSize: 16
                                    }}>
                                    Thêm vào giỏ hàng
                                </Button>
                                <Button size="large" onClick={() => navigate('/cart')}
                                    style={{ height: 50, borderRadius: 10, fontWeight: 600 }}>
                                    Xem giỏ hàng
                                </Button>
                                <Button
                                    size="large"
                                    onClick={handleToggleWishlist}
                                    loading={wishlistUpdating}
                                    icon={isInWishlist ? <HeartFilled /> : <HeartOutlined />}
                                    style={{ height: 50, borderRadius: 10, fontWeight: 600 }}
                                >
                                    {isInWishlist ? 'Da yeu thich' : 'Them yeu thich'}
                                </Button>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>

            <Card className="surface-card" style={{ marginTop: 20, borderRadius: 16 }}>
                <Title level={4}>Danh gia san pham</Title>
                <div style={{ marginBottom: 16 }}>
                    <Rate value={myRating} onChange={setMyRating} />
                    <TextArea
                        rows={4}
                        placeholder="Chia se trai nghiem cua ban..."
                        value={myComment}
                        onChange={(event) => setMyComment(event.target.value)}
                        style={{ marginTop: 12 }}
                    />
                    <Button type="primary" onClick={handleSubmitReview} loading={reviewSubmitting} style={{ marginTop: 12 }}>
                        Gui danh gia
                    </Button>
                </div>

                <List
                    dataSource={reviewData.reviews}
                    locale={{ emptyText: 'Chua co danh gia nao' }}
                    renderItem={(reviewItem) => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={<Avatar src={resolveImageUrl(reviewItem.user?.avatarUrl)}>{reviewItem.user?.username?.charAt(0)?.toUpperCase()}</Avatar>}
                                title={
                                    <Space>
                                        <Text strong>{reviewItem.user?.fullName || reviewItem.user?.username || 'Nguoi dung'}</Text>
                                        <Rate disabled value={reviewItem.rating} />
                                    </Space>
                                }
                                description={
                                    <>
                                        <Paragraph style={{ marginBottom: 0 }}>{reviewItem.comment || 'Khong co noi dung'}</Paragraph>
                                        <Text type="secondary">{new Date(reviewItem.updatedAt).toLocaleString('vi-VN')}</Text>
                                    </>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>

            <Card className="surface-card" style={{ marginTop: 20, borderRadius: 16 }}>
                <Title level={4}>San pham lien quan</Title>
                <Row gutter={[16, 16]}>
                    {relatedProducts.length > 0 ? relatedProducts.map((relatedItem) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={relatedItem._id}>
                            <ProductCard product={relatedItem} />
                        </Col>
                    )) : (
                        <Col span={24}>
                            <Text type="secondary">Chua co san pham lien quan</Text>
                        </Col>
                    )}
                </Row>
            </Card>
        </section>
    );
}
