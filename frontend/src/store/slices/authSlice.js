import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const loginUser = createAsyncThunk('auth/login', async ({ username, password }, { rejectWithValue }) => {
    try {
        const res = await api.post('/auth/login', { username, password });
        const token = res.data;
        localStorage.setItem('token', token);
        // Fetch user info
        const userRes = await api.get('/auth/me');
        localStorage.setItem('user', JSON.stringify(userRes.data));
        return { token, user: userRes.data };
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || err.response?.data || 'Đăng nhập thất bại');
    }
});

export const registerUser = createAsyncThunk('auth/register', async ({ fullName, username, password, email }, { rejectWithValue }) => {
    try {
        const res = await api.post('/auth/register', { fullName, username, password, email });
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Đăng ký thất bại');
    }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/auth/me');
        localStorage.setItem('user', JSON.stringify(res.data));
        return res.data;
    } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return rejectWithValue('Not logged in');
    }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
});

const initialUser = (() => {
    try {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    } catch { return null; }
})();

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: initialUser,
        token: localStorage.getItem('token') || null,
        loading: false,
        error: null
    },
    reducers: {
        clearError: (state) => { state.error = null; }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.user = action.payload.user;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(registerUser.fulfilled, (state) => { state.loading = false; })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchMe.fulfilled, (state, action) => { state.user = action.payload; })
            .addCase(fetchMe.rejected, (state) => { state.user = null; state.token = null; })
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.token = null;
            });
    }
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
