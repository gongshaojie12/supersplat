import i18next from 'i18next';
import { Events } from './events';
import { setWatermarkVisible } from './ui/watermark';

// 消息类型常量
const MSG_PREFIX = 'splat3d:';
const IS_SCENE_DIRTY = `${MSG_PREFIX}is-scene-dirty`;
const LOAD_FILE = `${MSG_PREFIX}load`;
const SET_LANG = `${MSG_PREFIX}set-lang`;
const SET_BRAND = `${MSG_PREFIX}set-brand`;
const SAVE_REQUEST = `${MSG_PREFIX}save-request`;
const READY = `${MSG_PREFIX}ready`;
const DIRTY_STATE = `${MSG_PREFIX}dirty-state`;
const SET_WATERMARK = `${MSG_PREFIX}set-watermark`;

// ---- 查询/响应接口 ----

interface IsSceneDirtyQuery {
    type: typeof IS_SCENE_DIRTY;
}

interface IsSceneDirtyResponse {
    type: typeof IS_SCENE_DIRTY;
    result: boolean;
}

// ---- 外壳 → 编辑器 ----

interface LoadFileMessage {
    type: typeof LOAD_FILE;
    url: string;
    filename?: string;
}

interface SetLangMessage {
    type: typeof SET_LANG;
    lang: string;
}

interface SetBrandMessage {
    type: typeof SET_BRAND;
    logo?: string;
    watermark?: boolean;
    name?: string;
}

interface SaveRequestMessage {
    type: typeof SAVE_REQUEST;
}

interface SetWatermarkMessage {
    type: typeof SET_WATERMARK;
    visible: boolean;
}

// ---- 编辑器 → 外壳 ----

interface ReadyMessage {
    type: typeof READY;
}

interface DirtyStateMessage {
    type: typeof DIRTY_STATE;
    isDirty: boolean;
}

// 类型守卫
const isSceneDirtyQuery = (data: any): data is IsSceneDirtyQuery => {
    return data?.type === IS_SCENE_DIRTY;
};

const isLoadFileMessage = (data: any): data is LoadFileMessage => {
    return data?.type === LOAD_FILE && typeof data.url === 'string';
};

const isSetLangMessage = (data: any): data is SetLangMessage => {
    return data?.type === SET_LANG && typeof data.lang === 'string';
};

const isSetBrandMessage = (data: any): data is SetBrandMessage => {
    return data?.type === SET_BRAND;
};

const isSaveRequestMessage = (data: any): data is SaveRequestMessage => {
    return data?.type === SAVE_REQUEST;
};

const isSetWatermarkMessage = (data: any): data is SetWatermarkMessage => {
    return data?.type === SET_WATERMARK && typeof data.visible === 'boolean';
};

const registerIframeApi = (events: Events) => {
    window.addEventListener('message', async (event: MessageEvent) => {
        const source = event.source as Window | null;
        if (!source) {
            return;
        }

        const data = event.data;

        // 场景脏状态查询（兼容旧协议）
        if (isSceneDirtyQuery(data)) {
            const response: IsSceneDirtyResponse = {
                type: IS_SCENE_DIRTY,
                result: events.invoke('scene.dirty') as boolean
            };
            source.postMessage(response, event.origin);
            return;
        }

        // 从 URL 加载文件
        if (isLoadFileMessage(data)) {
            await events.invoke('import', [{
                filename: data.filename || data.url.split('/').pop() || 'scene.ply',
                url: data.url
            }]);
            return;
        }

        // 切换语言
        if (isSetLangMessage(data)) {
            await i18next.changeLanguage(data.lang);
            window.location.reload();
            return;
        }

        // 设置品牌信息
        if (isSetBrandMessage(data)) {
            if (data.name) {
                const appLabel = document.getElementById('app-label');
                if (appLabel) {
                    appLabel.textContent = data.name;
                }
            }
            return;
        }

        // 设置水印可见性
        if (isSetWatermarkMessage(data)) {
            setWatermarkVisible(data.visible);
            return;
        }

        // 保存请求 - 触发场景保存事件
        if (isSaveRequestMessage(data)) {
            events.fire('doc.save.iframe');
            return;
        }
    });

    // 通知父窗口编辑器已就绪
    if (window.parent !== window) {
        const readyMsg: ReadyMessage = { type: READY };
        window.parent.postMessage(readyMsg, '*');

        // 监听脏状态变化并通知父窗口
        events.on('scene.dirty', () => {
            const dirtyMsg: DirtyStateMessage = {
                type: DIRTY_STATE,
                isDirty: events.invoke('scene.dirty') as boolean
            };
            window.parent.postMessage(dirtyMsg, '*');
        });
    }
};

export { registerIframeApi };
