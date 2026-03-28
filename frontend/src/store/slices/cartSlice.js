import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const CART_STORAGE_KEY = 'guest_cart';

// Load guest cart from localStorage
function loadGuestCart() {
    try {
        const data = localStorage.getItem(CART_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function saveGuestCart(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

// Fetch cart from server
export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/carts');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Lỗi tải giỏ hàng');
    }
});

// Sync guest cart to server on login
export const syncGuestCart = createAsyncThunk('cart/syncGuest', async (_, { rejectWithValue }) => {
    try {
        const guestCart = loadGuestCart();
        if (guestCart.length > 0) {
            for (const item of guestCart) {
                for (let i = 0; i < item.quantity; i++) {
                    await api.post('/carts/add', { product: item.productId });
                }
            }
            localStorage.removeItem(CART_STORAGE_KEY);
        }
        const res = await api.get('/carts');
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Lỗi đồng bộ giỏ hàng');
    }
});

export const addToCart = createAsyncThunk('cart/add', async ({ productId }, { getState, rejectWithValue }) => {
    const { auth } = getState();
    if (!auth.token) {
        return rejectWithValue('Vui long dang nhap de them vao gio hang');
    }
    try {
        const res = await api.post('/carts/add', { product: productId });
        return { type: 'server', data: res.data };
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Lỗi thêm vào giỏ');
    }
});

export const removeFromCart = createAsyncThunk('cart/remove', async ({ productId }, { getState, rejectWithValue }) => {
    const { auth } = getState();
    if (!auth.token) {
        return { type: 'guest', productId };
    }
    try {
        const res = await api.post('/carts/remove', { product: productId });
        return { type: 'server', data: res.data };
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Lỗi xóa giỏ hàng');
    }
});

export const decreaseFromCart = createAsyncThunk('cart/decrease', async ({ productId }, { getState, rejectWithValue }) => {
    const { auth } = getState();
    if (!auth.token) {
        return { type: 'guest_decrease', productId };
    }
    try {
        const res = await api.post('/carts/decrease', { product: productId });
        return { type: 'server', data: res.data };
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Lỗi giảm số lượng');
    }
});

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        items: [], // For logged-in: server cart. For guest: local items [{productId, quantity, product?}]
        serverCart: null,
        loading: false,
        error: null
    },
    reducers: {
        loadGuestCartFromStorage: (state) => {
            state.items = loadGuestCart();
        },
        clearCart: (state) => {
            state.items = [];
            state.serverCart = null;
            localStorage.removeItem(CART_STORAGE_KEY);
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCart.fulfilled, (state, action) => {
                state.serverCart = action.payload;
                state.items = action.payload?.products || [];
                state.loading = false;
            })
            .addCase(syncGuestCart.fulfilled, (state, action) => {
                state.serverCart = action.payload;
                state.items = action.payload?.products || [];
                state.loading = false;
            })
            .addCase(addToCart.fulfilled, (state, action) => {
                if (action.payload.type === 'guest') {
                    let guestCart = loadGuestCart();
                    let idx = guestCart.findIndex(i => i.productId === action.payload.productId);
                    if (idx === -1) {
                        guestCart.push({ productId: action.payload.productId, quantity: 1 });
                    } else {
                        guestCart[idx].quantity++;
                    }
                    saveGuestCart(guestCart);
                    state.items = guestCart;
                } else {
                    state.serverCart = action.payload.data;
                    state.items = action.payload.data?.products || [];
                }
            })
            .addCase(removeFromCart.fulfilled, (state, action) => {
                if (action.payload.type === 'guest') {
                    let guestCart = loadGuestCart();
                    guestCart = guestCart.filter(i => i.productId !== action.payload.productId);
                    saveGuestCart(guestCart);
                    state.items = guestCart;
                } else {
                    state.serverCart = action.payload.data;
                    state.items = action.payload.data?.products || [];
                }
            })
            .addCase(decreaseFromCart.fulfilled, (state, action) => {
                if (action.payload.type === 'guest_decrease') {
                    let guestCart = loadGuestCart();
                    let idx = guestCart.findIndex(i => i.productId === action.payload.productId);
                    if (idx !== -1) {
                        if (guestCart[idx].quantity <= 1) {
                            guestCart.splice(idx, 1);
                        } else {
                            guestCart[idx].quantity--;
                        }
                    }
                    saveGuestCart(guestCart);
                    state.items = guestCart;
                } else {
                    state.serverCart = action.payload.data;
                    state.items = action.payload.data?.products || [];
                }
            });
    }
});

export const { loadGuestCartFromStorage, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
