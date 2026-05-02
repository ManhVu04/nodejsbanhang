import { useEffect, useState } from 'react';
import { Table, Tag, Select, Button, Drawer, Descriptions, Card, Row, Col, DatePicker, Space, Statistic, Spin } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const { RangePicker } = DatePicker;

function diffObjects(before, after) {
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    const added = [], changed = [], removed = [];
    for (const k of allKeys) {
        const bv = JSON.stringify(before?.[k]);
        const av = JSON.stringify(after?.[k]);
        if (bv === undefined && av !== undefined) added.push(k);
        else if (bv !== undefined && av === undefined) removed.push(k);
        else if (bv !== av) changed.push(k);
    }
    return { added, changed, removed };
}

function JsonDiff({ label, data, highlight, type }) {
    if (!data) return <p style={{ color: '#999', fontSize: 12 }}>Không có dữ liệu</p>;
    const str = JSON.stringify(data, null, 2);
    const lines = str.split('\n').map((line, i) => {
        const key = line.match(/"(\w+)"\s*:/)?.[1];
        let bg = 'transparent';
        if (key) {
            if (type === 'before' && highlight.removed.includes(key)) bg = 'rgba(255,77,79,0.1)';
            if (type === 'before' && highlight.changed.includes(key)) bg = 'rgba(255,165,0,0.1)';
            if (type === 'after' && highlight.added.includes(key)) bg = 'rgba(82,196,26,0.12)';
            if (type === 'after' && highlight.changed.includes(key)) bg = 'rgba(82,196,26,0.12)';
        }
        return <div key={i} style={{ background: bg, lineHeight: '1.5' }}>{line}</div>;
    });
    return (
        <div>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
            <pre style={{ fontSize: 11, background: '#f7f3ee', padding: 10, borderRadius: 8, overflow: 'auto', maxHeight: 280 }}>{lines}</pre>
        </div>
    );
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({ action: '', resourceType: '', status: '', dateRange: null });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const params = { page, limit: 20 };
            if (filters.action) params.action = filters.action;
            if (filters.resourceType) params.resourceType = filters.resourceType;
            if (filters.status) params.status = filters.status;
            if (filters.dateRange?.[0]) params.startDate = filters.dateRange[0].toISOString();
            if (filters.dateRange?.[1]) params.endDate = filters.dateRange[1].toISOString();
            try {
                const res = await api.get('/auditLogs', { params });
                if (cancelled) return;
                setLogs(res.data.logs || []);
                setTotal(res.data.total || 0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [page, filters]);

    useEffect(() => {
        api.get('/auditLogs/stats').then((res) => setStats(res.data)).catch(() => {});
    }, []);

    const actionOptions = stats?.actionBreakdown?.map((a) => ({ value: a._id, label: a._id })) || [];
    const resourceTypes = ['product', 'order', 'user', 'inventory', 'voucher', 'return', 'category'];

    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            width: 150,
            render: (d) => d ? new Date(d).toLocaleString('vi-VN') : '—',
        },
        {
            title: 'Quản trị viên',
            render: (_, r) => r.admin?.username || '—',
            width: 130,
        },
        {
            title: 'Hành động',
            dataIndex: 'action',
            width: 160,
            render: (v, r) => (
                <Tag color={r.status === 'success' ? 'green' : 'red'}>{v}</Tag>
            ),
        },
        {
            title: 'Loại tài nguyên',
            render: (_, r) => r.resource?.type || '—',
            width: 120,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            ellipsis: true,
        },
        {
            title: '',
            width: 50,
            render: (_, r) => (
                <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => { setSelectedLog(r); setDrawerOpen(true); }}
                />
            ),
        },
    ];

    const highlight = selectedLog
        ? diffObjects(selectedLog.before, selectedLog.after)
        : { added: [], changed: [], removed: [] };

    return (
        <div>
            <AdminPageHeader
                title="Nhật ký hệ thống"
                subtitle="Lịch sử thao tác quản trị"
                breadcrumb={[{ label: 'Admin', to: '/admin' }, { label: 'Nhật ký hệ thống' }]}
            />

            {/* Stats row */}
            {stats ? (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {[
                        { label: 'Hành động hôm nay', value: stats.actionsToday },
                        { label: '7 ngày qua', value: stats.actionsLast7Days },
                        { label: 'Thất bại hôm nay', value: stats.failedActionsToday },
                        {
                            label: 'Admin hoạt động nhất',
                            value: stats.topAdmins?.[0]?.adminInfo?.[0]?.username || '—',
                            isText: true,
                        },
                    ].map((item, i) => (
                        <Col xs={24} sm={12} md={6} key={i}>
                            <Card className="admin-card" bordered={false} style={{ textAlign: 'center', padding: '4px 0' }}>
                                <Statistic
                                    title={<span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{item.label}</span>}
                                    value={item.isText ? item.value : item.value ?? 0}
                                    valueStyle={{ fontSize: 22, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            ) : <div style={{ marginBottom: 24 }}><Spin /></div>}

            {/* Filters */}
            <Card className="admin-card" bordered={false} style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Select
                        placeholder="Hành động"
                        allowClear
                        style={{ width: 180 }}
                        options={actionOptions}
                        value={filters.action || undefined}
                        onChange={(v) => setFilters((f) => ({ ...f, action: v || '', }))}
                    />
                    <Select
                        placeholder="Loại tài nguyên"
                        allowClear
                        style={{ width: 160 }}
                        options={resourceTypes.map((t) => ({ value: t, label: t }))}
                        value={filters.resourceType || undefined}
                        onChange={(v) => setFilters((f) => ({ ...f, resourceType: v || '' }))}
                    />
                    <Select
                        placeholder="Trạng thái"
                        allowClear
                        style={{ width: 130 }}
                        options={[{ value: 'success', label: 'Thành công' }, { value: 'failed', label: 'Thất bại' }]}
                        value={filters.status || undefined}
                        onChange={(v) => setFilters((f) => ({ ...f, status: v || '' }))}
                    />
                    <RangePicker
                        onChange={(dates) => setFilters((f) => ({ ...f, dateRange: dates }))}
                        value={filters.dateRange}
                        format="DD/MM/YYYY"
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => { setFilters({ action: '', resourceType: '', status: '', dateRange: null }); setPage(1); }}>
                        Đặt lại
                    </Button>
                </Space>
            </Card>

            <Card className="admin-card" bordered={false}>
                <Table
                    dataSource={logs}
                    columns={columns}
                    loading={loading}
                    rowKey="_id"
                    size="middle"
                    className="admin-table"
                    scroll={{ x: 700 }}
                    pagination={{ total, current: page, pageSize: 20, onChange: (p) => setPage(p), showSizeChanger: false }}
                />
            </Card>

            <Drawer
                title="Chi tiết nhật ký"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={640}
            >
                {selectedLog && (
                    <>
                        <Descriptions column={1} size="small" bordered style={{ marginBottom: 20 }}>
                            <Descriptions.Item label="Thời gian">
                                {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Quản trị viên">
                                {selectedLog.admin?.username || '—'} ({selectedLog.admin?.email || '—'})
                            </Descriptions.Item>
                            <Descriptions.Item label="Hành động">
                                <Tag color={selectedLog.status === 'success' ? 'green' : 'red'}>{selectedLog.action}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Tài nguyên">
                                {selectedLog.resource?.type} / {selectedLog.resource?.id}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={selectedLog.status === 'success' ? 'green' : 'red'}>{selectedLog.status}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="IP">{selectedLog.ipAddress || '—'}</Descriptions.Item>
                            {selectedLog.errorMessage && (
                                <Descriptions.Item label="Lỗi">
                                    <span style={{ color: '#ff4d4f' }}>{selectedLog.errorMessage}</span>
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        <Row gutter={12}>
                            <Col span={12}>
                                <JsonDiff label="Trước" data={selectedLog.before} highlight={highlight} type="before" />
                            </Col>
                            <Col span={12}>
                                <JsonDiff label="Sau" data={selectedLog.after} highlight={highlight} type="after" />
                            </Col>
                        </Row>
                    </>
                )}
            </Drawer>
        </div>
    );
}
