import { Statistic } from 'antd';

export default function AdminStatCard({ title, value, suffix, icon, accent = 1, sub, formatter }) {
    return (
        <div className="admin-stat-card">
            <div className={`admin-stat-card__icon admin-accent-${accent}`}>{icon}</div>
            <div className="admin-stat-card__body">
                <div className="admin-stat-card__label">{title}</div>
                <div className="admin-stat-card__value">
                    <Statistic
                        value={value}
                        suffix={suffix}
                        formatter={formatter}
                        valueStyle={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}
                    />
                </div>
                {sub && <div className="admin-stat-card__sub">{sub}</div>}
            </div>
        </div>
    );
}
