# AI and analysis models

CoinVisio combines small, data-fitted statistical models with a hosted language model. These are different parts of the system: the numerical models analyze market time series, while Iris uses an LLM to interpret supplied context and answer questions.

## Iris: hosted language model with retrieved context

The active Iris service and the analysis service's daily briefing call Groq's `llama-3.3-70b-versatile` model. This is Meta's 70-billion-parameter, text-only, autoregressive Transformer model, instruction-tuned for multilingual dialogue. At a high level, pretraining teaches the model to predict the next token from large text corpora; Meta then post-trains the chat version with supervised fine-tuning and reinforcement learning from human feedback (RLHF) to follow instructions and preferences. Meta's model card says Llama 3.3 pretraining used about 15 trillion tokens from publicly available sources, with instruction-tuning data that includes public datasets and over 25 million synthetic examples. These are the upstream model's training details, not work performed by this repository.

The code uses the hosted model both to extract a ticker symbol from a question and to write the final answer. For a symbol-specific question, Iris reads the latest market-regime, anomaly, and recommendation records from Supabase. It also runs a Tavily news search, then places those results and recent conversation history into the LLM prompt. This is retrieval-augmented generation (RAG): the service retrieves context at request time and asks a general-purpose language model to synthesize it.

There is no CoinVisio-owned LLM, custom training corpus, or fine-tuning step in this flow. The `temperature` and prompt settings shape generation; they do not train the underlying model. Market records and search results are context, not training data. Since this is a hosted provider model, its underlying pretraining details and weights are outside this repository and are not independently verified here.

The separate `CoinVisioBrain/IrisAIDeployment/` tree is an older/alternate implementation. It calls OpenAI's `gpt-oss-120b` through the Cerebras inference API. That is a separate, open-weight reasoning model with a mixture-of-experts architecture; it is not the model configured by the active Docker Compose Iris service. Provider model availability can change, so treat these names as the configuration captured in this repository, not a promise that the old deployment remains online.

## Smart signals: linear regression

`CoinVisioBrain/services/analysis/modules/smart_signals.py` creates a scikit-learn `LinearRegression` model for each symbol and each forecast horizon: one, seven, and thirty days. This is supervised regression, not a neural network: it learns linear coefficients by fitting the input features to known future prices in the supplied history. Inputs are close price, RSI(14), EMA(20), EMA(50), and volume; the target is a future close price. The code fits these models whenever the analysis job runs. It does not persist a learned model artifact for later inference. The parallel root-level implementation in `CoinVisioBrain/modules/smart_signals.py` follows the same fitting and filtering approach.

The reported `confidence_score` is the R² computed on the same rows used to fit that model. It is an in-sample fit score, not a calibrated probability or an out-of-sample forecast evaluation. A threshold of 0.5 filters results, and a prediction must differ from the current price by more than 1% to produce a LONG or SHORT signal. Stop levels are based on twice the current ATR. These implementation choices do not establish that the signals are profitable or predictive.

## Market regime: K-means clustering

`market_regime.py` averages daily returns and volatility across the available symbols, scales those two features with `StandardScaler`, and fits `KMeans` with three clusters. K-means is an unsupervised method that groups nearby points around learned cluster centers. The code names the clusters Bear, Sideways, and Bull by sorting their average returns. The scaler and cluster centers are refit on each supplied dataset. These are descriptive names assigned after clustering, not labels learned from a human-annotated training set.

## Anomaly detection: Isolation Forest

`anomaly.py` fits one scikit-learn `IsolationForest` per symbol using daily returns and volume change, with `contamination=0.05`. Isolation Forest is an unsupervised, tree-based outlier detector: unusual rows tend to be isolated with fewer random splits. The service checks whether the latest row is marked as an outlier. The model is refit for each analysis run; the 5% setting is a model parameter, not a guarantee that exactly 5% of future observations will be meaningful events.

## Recommendations: explicit rules

`recommender.py` is not a machine-learning model. It calculates RSI, volatility, returns, and volume change, then applies fixed threshold rules to create Conservative, Moderate, and Aggressive groups. No model training occurs in this module.

## Scope and limitations

The repository also contains experimental optimizer code, but it does not change the methods above into a validated or continuously trained forecasting system. The implementation should be treated as an engineering experiment. It has no documented walk-forward evaluation, leakage analysis, calibration study, or evidence of trading performance. Market signals and generated text are for research and software demonstration only, not financial advice.

## Implementation references

- `CoinVisioBrain/services/analysis/modules/smart_signals.py`
- `CoinVisioBrain/services/analysis/modules/llm_analyst.py`
- `CoinVisioBrain/modules/smart_signals.py` (parallel implementation)
- `CoinVisioBrain/modules/market_regime.py`
- `CoinVisioBrain/modules/anomaly.py`
- `CoinVisioBrain/modules/recommender.py`
- `CoinVisioBrain/services/irisai/modules/llm_client.py`
- `CoinVisioBrain/services/irisai/modules/rag_engine.py`
- `CoinVisioBrain/IrisAIDeployment/` (alternate implementation)

## Model references

- [Meta Llama 3.3 70B model card](https://github.com/meta-llama/llama-models/blob/main/models/llama3_3/MODEL_CARD.md) (architecture, pretraining, and post-training)
- [Groq model documentation](https://console.groq.com/docs/model/llama-3.3-70b-versatile) (the model ID used by the Iris service)
- [OpenAI GPT-OSS model card](https://openai.com/index/gpt-oss-model-card/) (the alternate model referenced by `CoinVisioBrain/IrisAIDeployment/`)
