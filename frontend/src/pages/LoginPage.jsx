import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, googleLoginUser, clearError } from '../store/slices/authSlice';
import { syncGuestCart, fetchCart } from '../store/slices/cartSlice';
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../utils/api';

const { Title, Text } = Typography;

export default function LoginPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector(state => state.auth);
    const [googleEnabled, setGoogleEnabled] = useState(false);
    const [googleClientId, setGoogleClientId] = useState('');
    const [googleLoading, setGoogleLoading] = useState(true);
    const googleButtonRef = useRef(null);
    const googleInitializedRef = useRef(false);

    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    const handleGoogleCredential = useCallback(async (response) => {
        try {
            let credential = String(response?.credential || '').trim();
            if (!credential) {
                message.error('Khong nhan duoc thong tin dang nhap Google');
                return;
            }

            await dispatch(googleLoginUser({ credential })).unwrap();
            await dispatch(syncGuestCart());
            await dispatch(fetchCart());
            message.success('Dang nhap Google thanh cong!');
            navigate('/');
        } catch (err) {
            message.error(err || 'Dang nhap Google that bai');
        }
    }, [dispatch, navigate]);

    useEffect(() => {
        let stillMounted = true;

        async function loadGoogleConfig() {
            try {
                let response = await api.get('/auth/google/config');
                if (!stillMounted) {
                    return;
                }

                let enabled = Boolean(response.data?.enabled && response.data?.clientId);
                setGoogleEnabled(enabled);
                setGoogleClientId(enabled ? String(response.data.clientId) : '');
            } catch {
                if (stillMounted) {
                    setGoogleEnabled(false);
                    setGoogleClientId('');
                }
            } finally {
                if (stillMounted) {
                    setGoogleLoading(false);
                }
            }
        }

        loadGoogleConfig();
        return () => {
            stillMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!googleEnabled || !googleClientId || !googleButtonRef.current) {
            return;
        }

        let cancelled = false;
        const scriptId = 'google-identity-services';

        function initializeGoogleButton() {
            if (cancelled || googleInitializedRef.current || !googleButtonRef.current) {
                return;
            }
            if (!window.google?.accounts?.id) {
                return;
            }

            googleButtonRef.current.innerHTML = '';
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleCredential
            });
            window.google.accounts.id.renderButton(googleButtonRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                shape: 'pill',
                text: 'continue_with',
                width: 320
            });
            googleInitializedRef.current = true;
        }

        const existingScript = document.getElementById(scriptId);
        if (window.google?.accounts?.id) {
            initializeGoogleButton();
        } else if (!existingScript) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeGoogleButton;
            document.body.appendChild(script);
        } else {
            existingScript.addEventListener('load', initializeGoogleButton);
        }

        return () => {
            cancelled = true;
            if (existingScript) {
                existingScript.removeEventListener('load', initializeGoogleButton);
            }
        };
    }, [googleEnabled, googleClientId, handleGoogleCredential]);

    const onFinish = async (values) => {
        try {
            await dispatch(loginUser(values)).unwrap();
            // Sync guest cart & fetch server cart
            await dispatch(syncGuestCart());
            await dispatch(fetchCart());
            message.success('Đăng nhập thành công!');
            navigate('/');
        } catch (err) {
            message.error(err || 'Đăng nhập thất bại');
        }
    };

    return (
        <section className="auth-page" aria-label="Đăng nhập">
            <Card className="auth-card" bodyStyle={{ padding: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
                        Đăng nhập
                    </Title>
                    <Text type="secondary">Chào mừng bạn trở lại!</Text>
                </div>

                {error && <div style={{ color: '#ff4d4f', marginBottom: 16, textAlign: 'center' }}>{error}</div>}

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block
                            style={{ height: 44, borderRadius: 10, fontWeight: 700 }}>
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>

                <Divider plain>Hoac</Divider>

                <div style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}>
                    {googleLoading && <Text type="secondary">Dang tai Google Sign-In...</Text>}
                    {!googleLoading && !googleEnabled && (
                        <Text type="secondary">Dang nhap Google chua duoc cau hinh tren he thong.</Text>
                    )}
                    {!googleLoading && googleEnabled && <div ref={googleButtonRef} />}
                </div>

                <Divider />
                <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Chưa có tài khoản? </Text>
                    <Link to="/register" style={{ fontWeight: 600 }}>Đăng ký ngay</Link>
                </div>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Link to="/forgot-password">Quên mật khẩu?</Link>
                </div>
            </Card>
        </section>
    );
}
