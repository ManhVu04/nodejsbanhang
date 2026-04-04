import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tag, Popconfirm, Card, Typography, Upload, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import api, { resolveImageUrl } from '../../utils/api';

const { Title } = Typography;
const ACCEPTED_PRODUCT_MEDIA_TYPES = 'image/*,video/mp4,video/webm,video/ogg,video/quicktime';

export default function ProductsManagePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [productMediaList, setProductMediaList] = useState([]);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [form] = Form.useForm();
    const imageValue = Form.useWatch('images', form);

    const fetchAll = useCallback(() => {
        setLoading(true);
        Promise.all([api.get('/products'), api.get('/categories')])
            .then(([p, c]) => {
                setProducts(Array.isArray(p.data) ? p.data : []);
                setCategories(Array.isArray(c.data) ? c.data : []);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const fetchProductMedia = useCallback(async (productId) => {
        if (!productId) {
            setProductMediaList([]);
            return;
        }

        setMediaLoading(true);
        try {
            const response = await api.get(`/product-media/${productId}`);
            const mediaItems = Array.isArray(response?.data?.media) ? response.data.media : [];
            setProductMediaList(mediaItems);

            const defaultImage = mediaItems.find((item) => item?.mediaType === 'image' && item?.isDefault)?.filePath
                || mediaItems.find((item) => item?.mediaType === 'image')?.filePath
                || '';

            if (defaultImage) {
                form.setFieldValue('images', defaultImage);
            }
        } catch {
            setProductMediaList([]);
        } finally {
            setMediaLoading(false);
        }
    }, [form]);

    const getRawUploadFile = (uploadFile) => uploadFile?.originFileObj || uploadFile;

    const detectMediaTypeFromFile = (uploadFile) => {
        let rawFile = getRawUploadFile(uploadFile);
        let mimeType = String(rawFile?.type || uploadFile?.type || '').toLowerCase();
        if (mimeType.startsWith('video/')) {
            return 'video';
        }

        let fileName = String(rawFile?.name || uploadFile?.name || '').toLowerCase();
        if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(fileName)) {
            return 'video';
        }

        return 'image';
    };

    const openCreate = () => {
        setEditItem(null);
        setProductMediaList([]);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = async (item) => {
        setEditItem(item);
        setProductMediaList([]);
        form.setFieldsValue({ title: item.title, sku: item.sku, price: item.price, description: item.description, category: item.category?._id || item.category, images: item.images?.[0] || '' });
        setModalOpen(true);
        await fetchProductMedia(item?._id);
    };

    const handleLegacyImageUpload = async ({ file, onSuccess, onError }) => {
        try {
            setUploadingImage(true);
            let formData = new FormData();
            formData.append('file', file);
            let response = await api.post('/upload/an_image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            form.setFieldValue('images', response.data.filename);
            message.success('Da tai anh len server');
            if (onSuccess) {
                onSuccess(response.data, file);
            }
        } catch (err) {
            message.error(err.response?.data?.message || 'Tai anh that bai');
            if (onError) {
                onError(err);
            }
        } finally {
            setUploadingImage(false);
        }
    };

    const handleProductMediaUpload = async ({ file, onSuccess, onError }) => {
        try {
            if (!editItem?._id) {
                throw new Error('Vui long luu san pham truoc khi tai media');
            }

            setUploadingImage(true);
            let formData = new FormData();
            let rawFile = getRawUploadFile(file);
            let mediaType = detectMediaTypeFromFile(file);
            formData.append('file', rawFile);
            formData.append('mediaType', mediaType);

            await api.post(`/product-media/upload/${editItem._id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            await fetchProductMedia(editItem._id);
            await fetchAll();
            message.success(mediaType === 'video' ? 'Da tai video len san pham' : 'Da tai anh len san pham');
            if (onSuccess) {
                onSuccess({}, file);
            }
        } catch (err) {
            message.error(err.response?.data?.message || err.message || 'Tai media that bai');
            if (onError) {
                onError(err);
            }
        } finally {
            setUploadingImage(false);
        }
    };

    const handleImageUpload = async (options) => {
        if (editItem?._id) {
            await handleProductMediaUpload(options);
            return;
        }
        await handleLegacyImageUpload(options);
    };

    const handleSetDefaultMedia = async (mediaId) => {
        if (!editItem?._id || !mediaId) {
            return;
        }

        try {
            await api.put(`/product-media/${mediaId}`, { isDefault: true });
            await fetchProductMedia(editItem._id);
            await fetchAll();
            message.success('Da dat media mac dinh');
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the dat media mac dinh');
        }
    };

    const handleDeleteMedia = async (mediaId) => {
        if (!editItem?._id || !mediaId) {
            return;
        }

        try {
            await api.delete(`/product-media/${mediaId}`);
            await fetchProductMedia(editItem._id);
            await fetchAll();
            message.success('Da xoa media');
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the xoa media');
        }
    };

    const handleReorderMedia = async (mediaId, direction) => {
        if (!editItem?._id || !mediaId) {
            return;
        }

        let sortedMedia = [...productMediaList].sort((a, b) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0));
        let currentIndex = sortedMedia.findIndex((item) => item?._id === mediaId);
        if (currentIndex < 0) {
            return;
        }

        let targetIndex = currentIndex + direction;
        if (targetIndex < 0 || targetIndex >= sortedMedia.length) {
            return;
        }

        [sortedMedia[currentIndex], sortedMedia[targetIndex]] = [sortedMedia[targetIndex], sortedMedia[currentIndex]];

        let mediaOrder = sortedMedia.map((item, index) => ({
            mediaId: item._id,
            displayOrder: index
        }));

        try {
            await api.put(`/product-media/reorder/${editItem._id}`, { mediaOrder });
            await fetchProductMedia(editItem._id);
            await fetchAll();
            message.success('Da sap xep lai media');
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the sap xep media');
        }
    };

    const handleSave = async () => {
        try {
            let values = await form.validateFields();

            if (editItem) {
                let updatePayload = {
                    title: values.title,
                    sku: values.sku,
                    price: values.price,
                    category: values.category,
                    description: values.description
                };

                // Keep ProductMedia list intact when editing product info.
                await api.put(`/products/${editItem._id}`, updatePayload);
                message.success('Cập nhật thành công');
            } else {
                let normalizedImage = String(values.images || '').trim();
                let createPayload = {
                    ...values,
                    images: normalizedImage ? [normalizedImage] : []
                };
                await api.post('/products', createPayload);
                message.success('Thêm sản phẩm thành công');
            }
            setModalOpen(false);
            fetchAll();
        } catch (err) {
            if (err.response) message.error(err.response.data?.message || err.response.data);
        }
    };

    const handleDelete = async (id) => {
        await api.delete(`/products/${id}`);
        message.success('Đã xóa');
        fetchAll();
    };

    const columns = [
        {
            title: 'Ảnh', dataIndex: 'images', width: 70,
            render: (imgs) => <img src={resolveImageUrl(imgs?.[0])} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
        },
        { title: 'Tên', dataIndex: 'title', ellipsis: true },
        { title: 'SKU', dataIndex: 'sku', width: 100 },
        { title: 'Giá', dataIndex: 'price', width: 120, render: p => `${p?.toLocaleString('vi-VN')}đ` },
        { title: 'Danh mục', dataIndex: 'category', width: 120, render: c => <Tag color="purple">{c?.name || 'N/A'}</Tag> },
        {
            title: 'Media',
            key: 'media',
            width: 110,
            render: (_, r) => (
                <Button size="small" onClick={() => openEdit(r)}>Quản lý</Button>
            )
        },
        {
            title: '', key: 'actions', width: 100,
            render: (_, r) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    <Popconfirm title="Xóa sản phẩm?" onConfirm={() => handleDelete(r._id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Quản lý sản phẩm</Title>
                    <Typography.Text type="secondary">ProductMedia nằm trong popup sửa sản phẩm hoặc nút Quản lý ở cột Media.</Typography.Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
                    style={{ borderRadius: 8, background: '#764ba2', border: 'none' }}>Thêm sản phẩm</Button>
            </div>
            <Card style={{ borderRadius: 12 }}>
                <Table dataSource={products} columns={columns} loading={loading} rowKey="_id" size="small" />
            </Card>

            <Modal title={editItem ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={handleSave} okText="Lưu">
                <Form form={form} layout="vertical">
                    <Form.Item name="title" label="Tên SP" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="price" label="Giá" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="category" label="Danh mục" rules={[{ required: true }]}>
                        <Select>{categories.filter(c => !c.isDeleted).map(c => <Select.Option key={c._id} value={c._id}>{c.name}</Select.Option>)}</Select>
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="images" label="Anh san pham">
                        <Input placeholder="filename.jpg" readOnly />
                    </Form.Item>
                    <Upload
                        accept={ACCEPTED_PRODUCT_MEDIA_TYPES}
                        multiple
                        maxCount={10}
                        showUploadList={false}
                        customRequest={handleImageUpload}
                    >
                        <Button icon={<UploadOutlined />} loading={uploadingImage}>{editItem ? 'Them media (anh/video) cho san pham' : 'Tai anh tu may tinh'}</Button>
                    </Upload>
                    {imageValue ? (
                        <div style={{ marginTop: 12 }}>
                            <Image src={resolveImageUrl(imageValue)} alt="preview" width={120} height={120} style={{ objectFit: 'cover', borderRadius: 8 }} />
                        </div>
                    ) : null}

                    {!editItem ? (
                        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                            Sau khi tạo sản phẩm, bấm Sửa hoặc Quản lý để xem và quản lý ProductMedia đầy đủ.
                        </Typography.Text>
                    ) : null}

                    {editItem ? (
                        <Form.Item label="Danh sach ProductMedia" style={{ marginTop: 16 }}>
                            <Card size="small" loading={mediaLoading}>
                                {productMediaList.length === 0 ? (
                                    <Typography.Text type="secondary">Chua co media cho san pham nay.</Typography.Text>
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        {productMediaList
                                            .slice()
                                            .sort((a, b) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0))
                                            .map((item, index) => (
                                                <div key={item?._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                    <Space>
                                                        {item?.mediaType === 'image' ? (
                                                            <Image src={resolveImageUrl(item?.filePath)} alt={item?.fileName || 'media'} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />
                                                        ) : (
                                                            <Tag color="geekblue">VIDEO</Tag>
                                                        )}
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <Typography.Text>{item?.fileName || item?.filePath}</Typography.Text>
                                                            <Space size={4}>
                                                                {item?.isDefault ? <Tag color="green">Default</Tag> : null}
                                                                <Tag>Order: {item?.displayOrder}</Tag>
                                                            </Space>
                                                        </div>
                                                    </Space>
                                                    <Space>
                                                        <Button size="small" onClick={() => handleReorderMedia(item?._id, -1)} disabled={index === 0}>Len</Button>
                                                        <Button size="small" onClick={() => handleReorderMedia(item?._id, 1)} disabled={index === productMediaList.length - 1}>Xuong</Button>
                                                        <Button size="small" onClick={() => handleSetDefaultMedia(item?._id)} disabled={item?.isDefault}>Mac dinh</Button>
                                                        <Popconfirm title="Xoa media nay?" onConfirm={() => handleDeleteMedia(item?._id)}>
                                                            <Button size="small" danger>Xoa</Button>
                                                        </Popconfirm>
                                                    </Space>
                                                </div>
                                            ))}
                                    </Space>
                                )}
                            </Card>
                        </Form.Item>
                    ) : null}
                </Form>
            </Modal>
        </div>
    );
}
