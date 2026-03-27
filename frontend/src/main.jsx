import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { store } from './store'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ConfigProvider
        locale={viVN}
        theme={{
          token: {
            colorPrimary: '#111111',
            colorInfo: '#111111',
            colorSuccess: '#111111',
            colorWarning: '#262626',
            colorError: '#111111',
            borderRadius: 12,
            fontFamily: "'Space Grotesk', 'Noto Sans', 'Segoe UI', sans-serif"
          }
        }}
      >
        <App />
      </ConfigProvider>
    </Provider>
  </StrictMode>
)
