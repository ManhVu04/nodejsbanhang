import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

export default function AdminPageHeader({ title, subtitle, breadcrumb, actions }) {
    const breadcrumbItems = breadcrumb
        ? breadcrumb.map((item) => ({
              title: item.to ? <Link to={item.to}>{item.label}</Link> : item.label,
          }))
        : undefined;

    return (
        <div className="admin-page-header">
            <div className="admin-page-header__left">
                {breadcrumbItems && (
                    <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 6 }} />
                )}
                <h1 className="admin-section-title">{title}</h1>
                {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="admin-page-header__actions">{actions}</div>}
        </div>
    );
}
