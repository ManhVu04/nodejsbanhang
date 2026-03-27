import { Row, Col, Input, Select, Pagination, Spin, Empty, Typography, Card } from 'antd';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

const { Search } = Input;
const { Title } = Typography;

export default function ProductsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';

    useEffect(() => {
        api.get('/categories').then(res => setCategories(res.data || [])).catch(() => {});
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [q, category, sort, minPrice, maxPrice, page]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 12 };
            if (q) params.q = q;
            if (category) params.category = category;
            if (sort) params.sort = sort;
            if (minPrice) params.minPrice = minPrice;
            if (maxPrice) params.maxPrice = maxPrice;

            const res = await api.get('/products/search', { params });
            setProducts(res.data.products || []);
            setTotal(res.data.total || 0);
        } catch {
            setProducts([]);
        }
        setLoading(false);
    };

    const updateFilter = (key, value) => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(key, value);
        else params.delete(key);
        setSearchParams(params);
        setPage(1);
    };

    return (
        <section className="page-container" aria-label="Danh sách sản phẩm">
            <Title level={3} style={{ marginBottom: 24 }}>
                {q ? `Kết quả tìm kiếm: "${q}"` : 'Tất cả sản phẩm'}
            </Title>

            <Card className="surface-card" style={{ marginBottom: 24, borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
                <Row gutter={[16, 12]} align="middle">
                    <Col xs={24} md={8}>
                        <Search
                            placeholder="Tìm kiếm..."
                            defaultValue={q}
                            onSearch={(v) => updateFilter('q', v)}
                            enterButton
                        />
                    </Col>
                    <Col xs={12} md={5}>
                        <Select
                            placeholder="Danh mục"
                            value={category || undefined}
                            onChange={(v) => updateFilter('category', v)}
                            allowClear
                            style={{ width: '100%' }}
                        >
                            {categories.filter(c => !c.isDeleted).map(c => (
                                <Select.Option key={c._id} value={c._id}>{c.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={12} md={5}>
                        <Select
                            placeholder="Sắp xếp"
                            value={sort || undefined}
                            onChange={(v) => updateFilter('sort', v)}
                            allowClear
                            style={{ width: '100%' }}
                        >
                            <Select.Option value="newest">Mới nhất</Select.Option>
                            <Select.Option value="price_asc">Giá tăng dần</Select.Option>
                            <Select.Option value="price_desc">Giá giảm dần</Select.Option>
                        </Select>
                    </Col>
                    <Col xs={12} md={3}>
                        <Input placeholder="Giá từ" type="number" value={minPrice}
                            onChange={(e) => updateFilter('minPrice', e.target.value)} />
                    </Col>
                    <Col xs={12} md={3}>
                        <Input placeholder="Giá đến" type="number" value={maxPrice}
                            onChange={(e) => updateFilter('maxPrice', e.target.value)} />
                    </Col>
                </Row>
            </Card>

            <Spin spinning={loading}>
                {products.length === 0 && !loading ? (
                    <Empty description="Không tìm thấy sản phẩm" style={{ padding: 60 }} />
                ) : (
                    <Row gutter={[16, 16]}>
                        {products.map(product => (
                            <Col xs={24} sm={12} md={8} lg={6} key={product._id}>
                                <ProductCard product={product} />
                            </Col>
                        ))}
                    </Row>
                )}
            </Spin>

            {total > 12 && (
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                    <Pagination current={page} total={total} pageSize={12} onChange={setPage} showTotal={(t) => `${t} sản phẩm`} />
                </div>
            )}
        </section>
    );
}
