import { useEffect, useMemo, useState } from 'react';
import { Card, Tag, Button, message } from 'antd';
import { LeftOutlined, RightOutlined, PlayCircleFilled, ShoppingCartOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import { resolveImageUrl } from '../utils/api';

export default function ProductCard({ product }) {
    const dispatch = useDispatch();
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const normalizedImages = useMemo(() => {
        let sourceList = Array.isArray(product?.images)
            ? product.images.map((item) => String(item || '').trim()).filter(Boolean)
            : [];

        if (sourceList.length === 0) {
            return [''];
        }

        return sourceList;
    }, [product?.images]);

    const hasMultipleImages = normalizedImages.length > 1;
    const hasVideo = Boolean(product?.mediaMeta?.hasVideo);

    useEffect(() => {
        setActiveImageIndex(0);
    }, [product?._id, normalizedImages.length]);

    const imageUrl = resolveImageUrl(normalizedImages[activeImageIndex]);

    const thumbnailItems = useMemo(() => {
        if (normalizedImages.length <= 4) {
            return normalizedImages.map((filePath, index) => ({ filePath, index }));
        }

        let startIndex = Math.max(0, Math.min(activeImageIndex - 1, normalizedImages.length - 4));
        return normalizedImages.slice(startIndex, startIndex + 4).map((filePath, offset) => ({
            filePath,
            index: startIndex + offset
        }));
    }, [normalizedImages, activeImageIndex]);

    const handleSelectImage = (event, imageIndex) => {
        event.preventDefault();
        event.stopPropagation();
        setActiveImageIndex(imageIndex);
    };

    const handlePrevImage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setActiveImageIndex((currentIndex) => {
            let nextIndex = currentIndex - 1;
            if (nextIndex < 0) {
                return normalizedImages.length - 1;
            }
            return nextIndex;
        });
    };

    const handleNextImage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setActiveImageIndex((currentIndex) => (currentIndex + 1) % normalizedImages.length);
    };

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

    return (
        <Link to={`/products/${product._id}`}>
            <Card
                hoverable
                className="surface-card product-card"
                cover={
                    <div className="product-card__media">
                        {hasVideo && (
                            <span className="product-card__video-badge">
                                <PlayCircleFilled /> Video
                            </span>
                        )}

                        <img
                            alt={product.title}
                            src={imageUrl}
                            className="product-card__image"
                            loading="lazy"
                        />

                        {hasMultipleImages && (
                            <>
                                <button
                                    type="button"
                                    className="product-card__control product-card__control--left"
                                    onClick={handlePrevImage}
                                    aria-label="Ảnh trước"
                                >
                                    <LeftOutlined />
                                </button>
                                <button
                                    type="button"
                                    className="product-card__control product-card__control--right"
                                    onClick={handleNextImage}
                                    aria-label="Ảnh tiếp theo"
                                >
                                    <RightOutlined />
                                </button>

                                <div className="product-card__thumbs">
                                    {thumbnailItems.map((thumbItem) => (
                                        <button
                                            key={`${product?._id}-${thumbItem?.index}`}
                                            type="button"
                                            className={`product-card__thumb ${thumbItem?.index === activeImageIndex ? 'product-card__thumb--active' : ''}`}
                                            onClick={(event) => handleSelectImage(event, thumbItem?.index)}
                                            aria-label={`Chọn ảnh ${thumbItem?.index + 1}`}
                                        >
                                            <img
                                                src={resolveImageUrl(thumbItem?.filePath)}
                                                alt={product?.title}
                                                loading="lazy"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
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
