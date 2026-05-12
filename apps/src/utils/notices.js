const getTimeValue = (value) => {
    const date = new Date(value ?? '');
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
};
export const getNoticeDisplayNumberMap = (notices) => {
    return new Map([...notices]
        .sort((a, b) => {
        const dateDiff = getTimeValue(a.date || a.createdAt) -
            getTimeValue(b.date || b.createdAt);
        if (dateDiff !== 0) {
            return dateDiff;
        }
        const createdDiff = getTimeValue(a.createdAt) - getTimeValue(b.createdAt);
        if (createdDiff !== 0) {
            return createdDiff;
        }
        return String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, {
            numeric: true,
        });
    })
        .map((notice, index) => [notice.id, index + 1]));
};
