import { Routes, Route } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Spin } from 'antd';
import { fetchMe } from './store/slices/authSlice';
import { fetchCart, clearCart } from './store/slices/cartSlice';

import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const VNPayReturnPage = lazy(() => import('./pages/VNPayReturnPage'));

const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const ProductsManagePage = lazy(() => import('./pages/admin/ProductsManagePage'));
const CategoriesManagePage = lazy(() => import('./pages/admin/CategoriesManagePage'));
const OrdersManagePage = lazy(() => import('./pages/admin/OrdersManagePage'));
const InventoryManagePage = lazy(() => import('./pages/admin/InventoryManagePage'));
const VouchersManagePage = lazy(() => import('./pages/admin/VouchersManagePage'));
const ReturnsManagePage = lazy(() => import('./pages/admin/ReturnsManagePage'));

function AppInit() {
    const dispatch = useDispatch();
    const { token } = useSelector(state => state.auth);

    useEffect(() => {
        if (token) {
            dispatch(fetchMe());
            dispatch(fetchCart());
        } else {
            dispatch(clearCart());
        }
    }, [dispatch, token]);

    return null;
}

function App() {
    return (
        <>
            <AppInit />
            <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>}>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/products/:id" element={<ProductDetailPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
                        <Route path="/vnpay-return" element={<VNPayReturnPage />} />
                        <Route path="/checkout" element={
                            <ProtectedRoute><CheckoutPage /></ProtectedRoute>
                        } />
                        <Route path="/orders" element={
                            <ProtectedRoute><OrdersPage /></ProtectedRoute>
                        } />
                        <Route path="/orders/:id" element={
                            <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute><ProfilePage /></ProtectedRoute>
                        } />

                        <Route path="/admin" element={
                            <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
                        }>
                            <Route index element={<DashboardPage />} />
                            <Route path="products" element={<ProductsManagePage />} />
                            <Route path="categories" element={<CategoriesManagePage />} />
                            <Route path="orders" element={<OrdersManagePage />} />
                            <Route path="inventory" element={<InventoryManagePage />} />
                            <Route path="vouchers" element={<VouchersManagePage />} />
                            <Route path="returns" element={<ReturnsManagePage />} />
                        </Route>
                    </Route>
                </Routes>
            </Suspense>
        </>
    );
}

export default App;
