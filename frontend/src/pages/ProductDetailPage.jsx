import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Row, Col, Typography, Button, Tag, Divider, Spin, message, Image, Card, Breadcrumb, Rate, List, Avatar, Form, Input, Empty, Pagination, Space } from 'antd';
import { ShoppingCartOutlined, HomeOutlined, UserOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, fetchCart } from '../store/slices/cartSlice';
import api, { resolveImageUrl } from '../utils/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const REVIEW_PAGE_SIZE = 5;

function formatReviewDate(value) {
    if (!value) {
        return '';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    return parsedDate.toLocaleString('vi-VN');
}

function normalizeReviewStats(rawStats) {
    return {
        reviewCount: Number(rawStats?.reviewCount || 0),
        averageRating: Number(rawStats?.averageRating || 0),
        distribution: {
            1: Number(rawStats?.distribution?.[1] || 0),
            2: Number(rawStats?.distribution?.[2] || 0),
            3: Number(rawStats?.distribution?.[3] || 0),
            4: Number(rawStats?.distribution?.[4] || 0),
            5: Number(rawStats?.distribution?.[5] || 0)
        }
    };
}

export default function ProductDetailPage() {
    const { id } = useParams();
    const { user } = useSelector((state) => state?.auth || {});
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [actionLoading, setActionLoading] = useState('');
    const [showStockLimitWarning, setShowStockLimitWarning] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsSubmitting, setReviewsSubmitting] = useState(false);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [reviewsTotal, setReviewsTotal] = useState(0);
    const [reviewFilter, setReviewFilter] = useState('all');
    const [reviewStats, setReviewStats] = useState(normalizeReviewStats());
    const [myReview, setMyReview] = useState(null);
    const [reviewForm] = Form.useForm();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const availableStock = Math.max(0, Number(product?.availableStock ?? 0));
    const maxSelectableQuantity = availableStock > 0 ? availableStock : 1;
    const isOutOfStock = availableStock < 1;

    useEffect(() => {
        let isCancelled = false;

        const fetchProductDetail = async () => {
            setLoading(true);
            try {
                const prodRes = await api.get(`/products/${id}`);
                if (!isCancelled) {
                    setProduct(prodRes?.data || null);
                }
            } catch {
                if (!isCancelled) {
                    message.error('Không tìm thấy sản phẩm');
                    navigate('/products');
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        fetchProductDetail();

        return () => {
            isCancelled = true;
        };
    }, [id, navigate]);

    const loadReviews = useCallback(async (targetPage = 1, targetFilter = reviewFilter) => {
        try {
            setReviewsLoading(true);
            const params = {
                page: targetPage,
                limit: REVIEW_PAGE_SIZE
            };

            if (targetFilter !== 'all') {
                params.rating = Number(targetFilter);
            }

            const res = await api.get(`/reviews/product/${id}`, { params });
            const payload = res?.data || {};
            const nextReviews = Array.isArray(payload?.reviews) ? payload?.reviews : [];
            const nextTotal = Number(payload?.total || 0);
            const nextPage = Number(payload?.page || targetPage);
            setReviews(nextReviews);
            setReviewsTotal(Number.isFinite(nextTotal) ? nextTotal : 0);
            setReviewsPage(Number.isFinite(nextPage) ? nextPage : 1);
            setReviewStats(normalizeReviewStats(payload?.stats));
        } catch (err) {
            message.error(err?.response?.data?.message || err?.response?.data || 'Không thể tải đánh giá sản phẩm');
            setReviews([]);
            setReviewsTotal(0);
            setReviewStats(normalizeReviewStats());
        } finally {
            setReviewsLoading(false);
        }
    }, [id, reviewFilter]);

    const loadMyReview = useCallback(async () => {
        if (!user?._id) {
            setMyReview(null);
            reviewForm.resetFields();
            return;
        }

        try {
            const res = await api.get(`/reviews/product/${id}/me`);
            const currentReview = res?.data?.review || null;
            setMyReview(currentReview);

            if (currentReview) {
                reviewForm.setFieldsValue({
                    rating: Number(currentReview?.rating || 0),
                    comment: String(currentReview?.comment || '')
                });
            } else {
                reviewForm.resetFields();
            }
        } catch (err) {
            if (err?.response?.status === 401 || err?.response?.status === 404) {
                setMyReview(null);
                reviewForm.resetFields();
                return;
            }
            message.error(err?.response?.data?.message || err?.response?.data || 'Không thể tải đánh giá của bạn');
            setMyReview(null);
        }
    }, [id, reviewForm, user?._id]);

    useEffect(() => {
        loadReviews(1, reviewFilter);
    }, [loadReviews, reviewFilter]);

    useEffect(() => {
        loadMyReview();
    }, [loadMyReview]);

    const normalizeQuantity = (value) => {
        const nextQuantity = Number(value);
        if (!Number.isFinite(nextQuantity)) {
            return 1;
        }
        return Math.min(maxSelectableQuantity, Math.max(1, Math.trunc(nextQuantity)));
    };

    useEffect(() => {
        if (availableStock > 0) {
            setQuantity((currentQuantity) => Math.min(currentQuantity, availableStock));
        } else {
            setQuantity(1);
        }
        setShowStockLimitWarning(false);
    }, [availableStock]);

    const addSelectedQuantityToCart = async () => {
        if (!product?._id) {
            throw new Error('Sản phẩm không hợp lệ');
        }
        if (isOutOfStock) {
            throw new Error('Sản phẩm hiện đã hết hàng');
        }
        if (quantity > availableStock) {
            throw new Error('Số lượng bạn chọn vượt quá số lượng tồn kho');
        }

        for (let index = 0; index < quantity; index += 1) {
            await dispatch(addToCart({ productId: product?._id })).unwrap();
        }
    };

    const setSelectedQuantityForBuyNow = async () => {
        if (!product?._id) {
            throw new Error('Sản phẩm không hợp lệ');
        }
        if (isOutOfStock) {
            throw new Error('Sản phẩm hiện đã hết hàng');
        }
        if (quantity > availableStock) {
            throw new Error('Số lượng bạn chọn vượt quá số lượng tồn kho');
        }

        await api.post('/carts/modify', {
            product: product?._id,
            quantity
        });
        await dispatch(fetchCart());
    };

    const handleAddToCart = async () => {
        try {
            setActionLoading('cart');
            await addSelectedQuantityToCart();
            message.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
        } catch (err) {
            message.error(err?.message || err || 'Thêm thất bại');
        } finally {
            setActionLoading('');
        }
    };

    const handleBuyNow = async () => {
        if (!user?._id) {
            message.info('Vui lòng đăng nhập để mua ngay');
            navigate('/login');
            return;
        }

        try {
            setActionLoading('buyNow');
            await setSelectedQuantityForBuyNow();
            navigate('/checkout');
        } catch (err) {
            message.error(err?.message || err || 'Mua ngay thất bại');
        } finally {
            setActionLoading('');
        }
    };

    const handleDecreaseQuantity = () => {
        setQuantity((currentQuantity) => normalizeQuantity(currentQuantity - 1));
        setShowStockLimitWarning(false);
    };

    const handleIncreaseQuantity = () => {
        if (availableStock > 0 && quantity >= availableStock) {
            setShowStockLimitWarning(true);
            return;
        }

        setQuantity((currentQuantity) => normalizeQuantity(currentQuantity + 1));
        setShowStockLimitWarning(false);
    };

    const handleQuantityInputChange = (event) => {
        const rawValue = event?.target?.value;
        const nextQuantity = Number(rawValue);
        const isExceeded = availableStock > 0 && Number.isFinite(nextQuantity) && nextQuantity > availableStock;

        setShowStockLimitWarning(isExceeded);
        setQuantity(normalizeQuantity(rawValue));
    };

    const handleReviewFilterChange = (nextFilter) => {
        setReviewFilter(nextFilter);
    };

    const handleReviewPageChange = (nextPage) => {
        loadReviews(nextPage, reviewFilter);
    };

    const handleSubmitReview = async (values) => {
        try {
            setReviewsSubmitting(true);
            await api.post(`/reviews/product/${id}`, {
                rating: Number(values?.rating || 0),
                comment: String(values?.comment || '').trim()
            });
            message.success(myReview?._id ? 'Đã cập nhật đánh giá của bạn' : 'Đã gửi đánh giá thành công');
            await loadReviews(1, reviewFilter);
            await loadMyReview();
        } catch (err) {
            if (err?.response?.status === 401) {
                message.error('Vui lòng đăng nhập để đánh giá sản phẩm');
                return;
            }
            message.error(err?.response?.data?.message || err?.response?.data || 'Gửi đánh giá thất bại');
        } finally {
            setReviewsSubmitting(false);
        }
    };

    const handleDeleteMyReview = async () => {
        if (!myReview?._id) {
            return;
        }

        try {
            setReviewsSubmitting(true);
            await api.delete(`/reviews/${myReview?._id}`);
            message.success('Đã xóa đánh giá của bạn');
            reviewForm.resetFields();
            await loadReviews(1, reviewFilter);
            await loadMyReview();
        } catch (err) {
            message.error(err?.response?.data?.message || err?.response?.data || 'Xóa đánh giá thất bại');
        } finally {
            setReviewsSubmitting(false);
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingBlock: 80 }}><Spin size="large" /></div>;
    if (!product) return null;

    const imageUrl = resolveImageUrl(product?.images?.[0]);
    const currentAverageRating = Number(reviewStats?.averageRating || 0);
    const currentReviewCount = Number(reviewStats?.reviewCount || 0);
    const reviewFilters = [
        { key: 'all', label: `Tất cả (${currentReviewCount})` },
        { key: 5, label: `5 Sao (${Number(reviewStats?.distribution?.[5] || 0)})` },
        { key: 4, label: `4 Sao (${Number(reviewStats?.distribution?.[4] || 0)})` },
        { key: 3, label: `3 Sao (${Number(reviewStats?.distribution?.[3] || 0)})` },
        { key: 2, label: `2 Sao (${Number(reviewStats?.distribution?.[2] || 0)})` },
        { key: 1, label: `1 Sao (${Number(reviewStats?.distribution?.[1] || 0)})` }
    ];

    return (
        <section className="product-detail" aria-label="Chi tiết sản phẩm">
            <Breadcrumb style={{ marginBottom: 16 }} items={[
                { title: <a onClick={() => navigate('/')}><HomeOutlined /> Trang chủ</a> },
                { title: <a onClick={() => navigate('/products')}>Sản phẩm</a> },
                { title: product?.title }
            ]} />

            <Card className="surface-card" style={{ borderRadius: 16, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
                <Row>
                    <Col xs={24} md={12}>
                        <div style={{ padding: 24, background: '#fafafa', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                            <Image
                                src={imageUrl}
                                alt={product?.title}
                                style={{ maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
                                preview={{ mask: 'Xem ảnh lớn' }}
                            />
                        </div>
                    </Col>
                    <Col xs={24} md={12}>
                        <div style={{ padding: 32 }}>
                            {product?.category?.name && <Tag color="default">{product?.category?.name}</Tag>}
                            <Title level={2} style={{ marginTop: 8, marginBottom: 8 }}>{product?.title}</Title>
                            <Text type="secondary">SKU: {product?.sku}</Text>
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <Rate disabled allowHalf value={currentAverageRating} />
                                <Text strong>{currentAverageRating.toFixed(1)}</Text>
                                <Text type="secondary">({currentReviewCount} đánh giá)</Text>
                            </div>

                            <Divider />

                            <Title level={2} style={{ color: '#e74c3c', margin: '0 0 16px' }}>
                                {product?.price?.toLocaleString('vi-VN')}đ
                            </Title>

                            <Divider />

                            <div style={{ marginBottom: 20 }}>
                                <Text strong style={{ display: 'block', marginBottom: 10 }}>Số lượng</Text>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #d9d9d9', borderRadius: 10, overflow: 'hidden' }}>
                                        <Button
                                            type="text"
                                            onClick={handleDecreaseQuantity}
                                            style={{ width: 44, height: 44, borderRadius: 0 }}
                                            disabled={isOutOfStock}
                                        >
                                            -
                                        </Button>
                                        <input
                                            value={quantity}
                                            onChange={handleQuantityInputChange}
                                            style={{
                                                width: 64,
                                                height: 44,
                                                border: 'none',
                                                borderInline: '1px solid #d9d9d9',
                                                textAlign: 'center',
                                                outline: 'none',
                                                fontWeight: 600
                                            }}
                                            disabled={isOutOfStock}
                                        />
                                        <Button
                                            type="text"
                                            onClick={handleIncreaseQuantity}
                                            style={{ width: 44, height: 44, borderRadius: 0 }}
                                            disabled={isOutOfStock}
                                        >
                                            +
                                        </Button>
                                    </div>
                                    <Text type="secondary">{availableStock.toLocaleString('vi-VN')} sản phẩm có sẵn</Text>
                                </div>
                                {showStockLimitWarning && (
                                    <Text style={{ color: '#ff4d4f', display: 'block', marginTop: 10 }}>
                                        Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này
                                    </Text>
                                )}
                                {isOutOfStock && (
                                    <Text style={{ color: '#ff4d4f', display: 'block', marginTop: 10 }}>
                                        Sản phẩm hiện đã hết hàng
                                    </Text>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <Button type="primary" size="large" icon={<ShoppingCartOutlined />}
                                    onClick={handleAddToCart}
                                    loading={actionLoading === 'cart'}
                                    disabled={isOutOfStock}
                                    style={{
                                        height: 50, paddingInline: 32, borderRadius: 10, fontWeight: 700,
                                        fontSize: 16
                                    }}>
                                    Thêm vào giỏ hàng
                                </Button>
                                <Button
                                    size="large"
                                    onClick={handleBuyNow}
                                    loading={actionLoading === 'buyNow'}
                                    disabled={isOutOfStock}
                                    style={{ height: 50, borderRadius: 10, fontWeight: 700 }}
                                >
                                    Mua ngay
                                </Button>
                                <Button size="large" onClick={() => navigate('/cart')}
                                    style={{ height: 50, borderRadius: 10, fontWeight: 600 }}>
                                    Xem giỏ hàng
                                </Button>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>

            <Card className="surface-card" style={{ borderRadius: 16, marginTop: 20 }}>
                <Title level={4} style={{ marginTop: 0 }}>Mô tả sản phẩm</Title>
                <Paragraph style={{ fontSize: 15, color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                    {product?.description || 'Chưa có mô tả sản phẩm.'}
                </Paragraph>
            </Card>

            <Card className="surface-card" style={{ borderRadius: 16, marginTop: 16 }}>
                <Title level={4} style={{ marginTop: 0 }}>Đánh giá sản phẩm</Title>

                <Card size="small" style={{ borderRadius: 12, marginBottom: 18, borderColor: '#ffe7d9', background: '#fffaf6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                            <Title level={2} style={{ margin: 0, color: '#ee4d2d' }}>{currentAverageRating.toFixed(1)}</Title>
                            <Text style={{ color: '#ee4d2d' }}>trên 5</Text>
                            <div>
                                <Rate disabled allowHalf value={currentAverageRating} style={{ color: '#ee4d2d', fontSize: 18 }} />
                            </div>
                        </div>
                        <Space size={[8, 8]} wrap>
                            {reviewFilters.map((filterOption) => (
                                <Button
                                    key={String(filterOption?.key)}
                                    type={reviewFilter === filterOption?.key ? 'primary' : 'default'}
                                    onClick={() => handleReviewFilterChange(filterOption?.key)}
                                    style={reviewFilter === filterOption?.key ? {} : { borderColor: '#d9d9d9' }}
                                >
                                    {filterOption?.label}
                                </Button>
                            ))}
                        </Space>
                    </div>
                </Card>

                <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
                    <Title level={5} style={{ marginTop: 0 }}>
                        {myReview?._id ? 'Sửa đánh giá của bạn' : 'Viết đánh giá'}
                    </Title>
                    {!user?._id ? (
                        <Space direction="vertical" size={10}>
                            <Text type="secondary">Bạn cần đăng nhập để gửi đánh giá.</Text>
                            <Button onClick={() => navigate('/login')}>Đăng nhập để đánh giá</Button>
                        </Space>
                    ) : (
                        <Form form={reviewForm} layout="vertical" onFinish={handleSubmitReview} initialValues={{ rating: 5, comment: '' }}>
                            <Form.Item
                                label="Số sao"
                                name="rating"
                                rules={[{ required: true, message: 'Vui lòng chọn số sao' }]}
                            >
                                <Rate />
                            </Form.Item>
                            <Form.Item
                                label="Nội dung đánh giá"
                                name="comment"
                                rules={[{ max: 1000, message: 'Nội dung đánh giá tối đa 1000 ký tự' }]}
                            >
                                <TextArea rows={4} placeholder="Chia sẻ trải nghiệm của bạn..." showCount maxLength={1000} />
                            </Form.Item>
                            <Space>
                                <Button type="primary" htmlType="submit" loading={reviewsSubmitting}>
                                    {myReview?._id ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                                </Button>
                                {myReview?._id && (
                                    <Button danger onClick={handleDeleteMyReview} loading={reviewsSubmitting}>
                                        Xóa đánh giá của tôi
                                    </Button>
                                )}
                            </Space>
                        </Form>
                    )}
                </Card>

                {reviewsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Spin />
                    </div>
                ) : reviews.length === 0 ? (
                    <Empty description="Chưa có đánh giá nào" />
                ) : (
                    <>
                        <List
                            itemLayout="vertical"
                            dataSource={reviews}
                            renderItem={(reviewItem, reviewIndex) => {
                                const reviewerName = reviewItem?.user?.fullName || reviewItem?.user?.username || 'Người dùng';
                                const reviewerAvatar = reviewItem?.user?.avatarUrl
                                    ? resolveImageUrl(reviewItem?.user?.avatarUrl)
                                    : undefined;

                                return (
                                    <List.Item key={String(reviewItem?._id || `${reviewerName}-${reviewIndex}`)}>
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar src={reviewerAvatar} icon={!reviewerAvatar ? <UserOutlined /> : null}>
                                                    {!reviewerAvatar ? String(reviewerName || 'U').charAt(0).toUpperCase() : null}
                                                </Avatar>
                                            }
                                            title={
                                                <Space size={8} wrap>
                                                    <Text strong>{reviewerName}</Text>
                                                    <Rate disabled value={Number(reviewItem?.rating || 0)} style={{ fontSize: 14 }} />
                                                </Space>
                                            }
                                            description={formatReviewDate(reviewItem?.updatedAt || reviewItem?.createdAt)}
                                        />
                                        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>
                                            {String(reviewItem?.comment || '').trim() || 'Người dùng không để lại nhận xét.'}
                                        </Paragraph>
                                    </List.Item>
                                );
                            }}
                        />
                        {reviewsTotal > REVIEW_PAGE_SIZE && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Pagination
                                    current={reviewsPage}
                                    pageSize={REVIEW_PAGE_SIZE}
                                    total={reviewsTotal}
                                    onChange={handleReviewPageChange}
                                    showSizeChanger={false}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>
        </section>
    );
}
