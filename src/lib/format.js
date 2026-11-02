export const dateText = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
