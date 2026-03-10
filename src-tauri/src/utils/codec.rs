use base64::{
    engine::general_purpose::{
        STANDARD as BASE64_STANDARD, STANDARD_NO_PAD as BASE64_STANDARD_NO_PAD,
        URL_SAFE as BASE64_URL_SAFE, URL_SAFE_NO_PAD as BASE64_URL_SAFE_NO_PAD,
    },
    Engine as _,
};
use prost::Message;
use serde_json::Value;

#[derive(serde::Serialize)]
struct UserContextView {
    status: i32,
    plan_name: String,
    email: String,
    models: Option<AppConfigView>,
    plan: Option<SubscriptionView>,
}

#[derive(serde::Serialize)]
struct AppConfigView {
    items: Vec<ModelConfigView>,
    recommended: Option<RecommendedModelsView>,
    default_model: Option<DefaultModelView>,
}

#[derive(serde::Serialize)]
struct ModelConfigView {
    name: String,
    id: Option<ModelIdView>,
    field_5: i32,
    field_11: i32,
    meta: Option<ModelMetaView>,
    tag: String,
    supported_types: Vec<MimeTypeSupportView>,
}

#[derive(serde::Serialize)]
struct ModelIdView {
    id: i32,
}

#[derive(serde::Serialize)]
struct ModelMetaView {
    rate_limit: f32,
    timestamp: Option<MetaTimestampView>,
}

#[derive(serde::Serialize)]
struct MetaTimestampView {
    value: i64,
}

#[derive(serde::Serialize)]
struct MimeTypeSupportView {
    mime_type: String,
    enabled: i32,
}

#[derive(serde::Serialize)]
struct RecommendedModelsView {
    category: String,
    list: Option<RecommendedListView>,
}

#[derive(serde::Serialize)]
struct RecommendedListView {
    model_names: Vec<String>,
}

#[derive(serde::Serialize)]
struct DefaultModelView {
    model: Option<ModelIdView>,
}

#[derive(serde::Serialize)]
struct SubscriptionView {
    tier_id: String,
    tier_name: String,
    display_name: String,
    upgrade_url: String,
    upgrade_message: String,
}

impl From<crate::proto::state_sync::UserContext> for UserContextView {
    fn from(value: crate::proto::state_sync::UserContext) -> Self {
        Self {
            status: value.status,
            plan_name: value.plan_name,
            email: value.email,
            models: value.models.map(AppConfigView::from),
            plan: value.plan.map(SubscriptionView::from),
        }
    }
}

impl From<crate::proto::state_sync::AppConfig> for AppConfigView {
    fn from(value: crate::proto::state_sync::AppConfig) -> Self {
        Self {
            items: value.items.into_iter().map(ModelConfigView::from).collect(),
            recommended: value.recommended.map(RecommendedModelsView::from),
            default_model: value.default_model.map(DefaultModelView::from),
        }
    }
}

impl From<crate::proto::state_sync::ModelConfig> for ModelConfigView {
    fn from(value: crate::proto::state_sync::ModelConfig) -> Self {
        Self {
            name: value.name,
            id: value.id.map(ModelIdView::from),
            field_5: value.field_5,
            field_11: value.field_11,
            meta: value.meta.map(ModelMetaView::from),
            tag: value.tag,
            supported_types: value
                .supported_types
                .into_iter()
                .map(MimeTypeSupportView::from)
                .collect(),
        }
    }
}

impl From<crate::proto::state_sync::ModelId> for ModelIdView {
    fn from(value: crate::proto::state_sync::ModelId) -> Self {
        Self { id: value.id }
    }
}

impl From<crate::proto::state_sync::ModelMeta> for ModelMetaView {
    fn from(value: crate::proto::state_sync::ModelMeta) -> Self {
        Self {
            rate_limit: value.rate_limit,
            timestamp: value.timestamp.map(MetaTimestampView::from),
        }
    }
}

impl From<crate::proto::state_sync::MetaTimestamp> for MetaTimestampView {
    fn from(value: crate::proto::state_sync::MetaTimestamp) -> Self {
        Self { value: value.value }
    }
}

impl From<crate::proto::state_sync::MimeTypeSupport> for MimeTypeSupportView {
    fn from(value: crate::proto::state_sync::MimeTypeSupport) -> Self {
        Self {
            mime_type: value.mime_type,
            enabled: value.enabled,
        }
    }
}

impl From<crate::proto::state_sync::RecommendedModels> for RecommendedModelsView {
    fn from(value: crate::proto::state_sync::RecommendedModels) -> Self {
        Self {
            category: value.category,
            list: value.list.map(RecommendedListView::from),
        }
    }
}

impl From<crate::proto::state_sync::RecommendedList> for RecommendedListView {
    fn from(value: crate::proto::state_sync::RecommendedList) -> Self {
        Self {
            model_names: value.model_names,
        }
    }
}

impl From<crate::proto::state_sync::DefaultModel> for DefaultModelView {
    fn from(value: crate::proto::state_sync::DefaultModel) -> Self {
        Self {
            model: value.model.map(ModelIdView::from),
        }
    }
}

impl From<crate::proto::state_sync::Subscription> for SubscriptionView {
    fn from(value: crate::proto::state_sync::Subscription) -> Self {
        Self {
            tier_id: value.tier_id,
            tier_name: value.tier_name,
            display_name: value.display_name,
            upgrade_url: value.upgrade_url,
            upgrade_message: value.upgrade_message,
        }
    }
}

fn user_context_to_json(context: crate::proto::state_sync::UserContext) -> Value {
    serde_json::to_value(UserContextView::from(context)).unwrap_or_else(|e| {
        tracing::error!(error = %e, "UserContext JSON 序列化失败");
        Value::Null
    })
}

pub fn decode_base64(raw: &str, field_name: &str) -> Result<Vec<u8>, String> {
    BASE64_STANDARD
        .decode(raw)
        .or_else(|_| BASE64_STANDARD_NO_PAD.decode(raw))
        .or_else(|_| BASE64_URL_SAFE.decode(raw))
        .or_else(|_| BASE64_URL_SAFE_NO_PAD.decode(raw))
        .map_err(|e| format!("{} Base64 解码失败: {}", field_name, e))
}

/// 通用的 Protobuf 包装器解码流程
/// T: 外層 Wrapper 類型（e.g., OAuthTokenWrapper、UserStatusWrapper）
/// F: 提取函式，負責從包裝器中提取並轉換數據
fn decode_wrapper_and_extract<T, F>(
    raw: &str,
    field_name: &str,
    wrapper_error_msg: &str,
    extract_fn: F,
) -> Result<Value, String>
where
    T: Message + Default,
    F: Fn(T) -> Result<Value, String>,
{
    let wrapper_bytes = decode_base64(raw, field_name)?;
    let wrapper = T::decode(wrapper_bytes.as_slice())
        .map_err(|e| format!("{} Proto 解码失败: {}", wrapper_error_msg, e))?;
    extract_fn(wrapper)
}

pub fn decode_oauth_token(raw: &str) -> Result<Value, String> {
    decode_wrapper_and_extract::<crate::proto::state_sync::OAuthTokenWrapper, _>(
        raw,
        crate::constants::database::OAUTH_TOKEN,
        "oauthToken Wrapper",
        |wrapper| {
            let inner = wrapper
                .inner
                .ok_or_else(|| "oauthToken 缺少 inner".to_string())?;
            let data = inner
                .data
                .ok_or_else(|| "oauthToken 缺少 data".to_string())?;

            let oauth_info_bytes =
                decode_base64(&data.oauth_info_base64, "oauthToken.data.oauth_info_base64")?;
            let oauth_info =
                crate::proto::state_sync::OAuthInfo::decode(oauth_info_bytes.as_slice())
                    .map_err(|e| format!("oauthToken OAuthInfo Proto 解码失败: {}", e))?;

            Ok(serde_json::json!({
                "sentinelKey": inner.sentinel_key,
                "accessToken": oauth_info.access_token,
                "refreshToken": oauth_info.refresh_token,
                "tokenType": oauth_info.token_type,
                "expirySeconds": oauth_info.expiry.map(|t| t.seconds),
            }))
        },
    )
}

pub fn decode_user_status(raw: &str) -> Result<Value, String> {
    decode_wrapper_and_extract::<crate::proto::state_sync::UserStatusWrapper, _>(
        raw,
        crate::constants::database::USER_STATUS,
        "userStatus Wrapper",
        |wrapper| {
            let inner = wrapper
                .inner
                .ok_or_else(|| "userStatus 缺少 inner".to_string())?;
            let data = inner
                .data
                .ok_or_else(|| "userStatus 缺少 data".to_string())?;

            let raw_data_bytes = decode_base64(&data.raw_data, "userStatus.data.raw_data")?;
            let context = crate::proto::state_sync::UserContext::decode(raw_data_bytes.as_slice())
                .map_err(|e| format!("userStatus raw_data UserContext Proto 解码失败: {}", e))?;

            Ok(serde_json::json!({
                "sentinelKey": inner.sentinel_key,
                "rawDataType": "proto",
                "rawData": user_context_to_json(context),
            }))
        },
    )
}

/// 优先从 OAuth Token 中提取 Access Token，如果没有或失败，则回退到 api_key
pub fn extract_preferred_access_token(
    oauth_token_raw: Option<&str>,
    auth_status_json: &Value,
) -> Result<String, String> {
    if let Some(token_raw) = oauth_token_raw {
        // 尝试解码 OAuth Token
        match decode_oauth_token(token_raw) {
            Ok(token_value) => {
                // 如果解码成功，尝试获取 accessToken
                let access_token = token_value
                    .get("accessToken")
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());

                if let Some(at) = access_token {
                    return Ok(at);
                }
                // 如果 OAuth Token 里拿不到 accessToken，或者为空，则回退到下面的逻辑
            }
            // 解码失败，也回退
            Err(_) => {}
        }
    }

    // 回退：从 auth_status_json 中获取 apiKey
    let api_key = auth_status_json
        .get("apiKey")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .unwrap_or("")
        .to_string();

    if api_key.is_empty() {
        return Err("无法获取有效的 Access Token (OAuth Token 和 API Key 均不可用)".to_string());
    }

    Ok(api_key)
}

/// 从 OAuth Token 中提取 Refresh Token
pub fn extract_refresh_token(oauth_token_raw: Option<&str>) -> Option<String> {
    let token_raw = oauth_token_raw?;
    match decode_oauth_token(token_raw) {
        Ok(token_value) => token_value
            .get("refreshToken")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string()),
        Err(_) => None,
    }
}
