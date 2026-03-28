import { Result, Button, Spin } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function VNPayReturnPage() {
    const [searchParams] = useSearchParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const params = Object.fromEntries(searchParams.entries());
        api.get('/vnpay/vnpay-return', { params })
            .then(res => setResult(res.data))
            .catch(() => setResult({ code: '99', message: 'Lỗi xử lý thanh toán' }))
            .finally(() => setLoading(false));
    }, [searchParams]);

    if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /><div>Đang xử lý thanh toán...</div></div>;

    const isSuccess = result?.code === '00';

    return (
        <div style={{ padding: 60 }}>
            <Result
                status={isSuccess ? 'success' : 'error'}
                title={isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
                subTitle={result?.message}
                extra={[
                    <Button type="primary" key="orders" onClick={() => navigate('/orders')}
                        style={{ borderRadius: 8, background: '#764ba2', border: 'none' }}>
                        Xem đơn hàng
                    </Button>,
                    <Button key="home" onClick={() => navigate('/')} style={{ borderRadius: 8 }}>
                        Về trang chủ
                    </Button>
                ]}
            />
        </div>
    );
}
