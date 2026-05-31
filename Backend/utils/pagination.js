function clampPagination(query = {}, options = {}) {
    let { defaultLimit = 10, maxLimit = 100 } = options;
    let page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    let limit = Math.min(
        maxLimit,
        Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit)
    );
    return { page, limit, skip: (page - 1) * limit };
}

module.exports = { clampPagination };
