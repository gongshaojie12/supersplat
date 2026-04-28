let watermarkElement: HTMLDivElement | null = null;

export function showWatermark() {
    if (watermarkElement) return;

    watermarkElement = document.createElement('div');
    watermarkElement.id = 'splat3d-watermark';
    watermarkElement.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.5);
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        font-family: Inter, sans-serif;
        border-radius: 6px;
        pointer-events: none;
        z-index: 9999;
        user-select: none;
    `;
    watermarkElement.textContent = 'Made with Splat3D';

    document.body.appendChild(watermarkElement);
}

export function hideWatermark() {
    if (watermarkElement) {
        watermarkElement.remove();
        watermarkElement = null;
    }
}

export function setWatermarkVisible(visible: boolean) {
    if (visible) {
        showWatermark();
    } else {
        hideWatermark();
    }
}
