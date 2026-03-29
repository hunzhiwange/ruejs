set -euo pipefail

export RES_PATH=learn-wgpu

RUSTFLAGS='--cfg getrandom_backend="wasm_js"'
export RUSTFLAGS

if ! rustup target list --installed | grep -q 'wasm32-unknown-unknown'; then
  echo '需要安装 Rust 目标 wasm32-unknown-unknown：rustup target add wasm32-unknown-unknown'
  exit 1
fi

# 构建以 WebGL 为后端的示例程序，避免 WebGPU 不稳定 API
cargo build --no-default-features --profile wasm-release --target wasm32-unknown-unknown \
--bin ruedes \
--bin vertex-animation \
--bin tutorial1-window \
--bin solar-system \
--bin @rue-js/design

# 创建 wasm 目录
mkdir -p "pkg"
mkdir -p "wasm"

# Generate bindings
if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo '未找到 wasm-bindgen，请安装：cargo install wasm-bindgen-cli --version 0.2.105'
  exit 1
fi
WB_VERSION="$(wasm-bindgen --version | awk '{print $2}')"
if [ "$WB_VERSION" != "0.2.105" ]; then
  echo "wasm-bindgen 版本需为 0.2.105，当前为 $WB_VERSION"
  exit 1
fi
for i in target/wasm32-unknown-unknown/wasm-release/*.wasm;
do
    wasm-bindgen --no-typescript --out-dir pkg --web "$i";
    # 优化 wasm 包大小
    filename=$(basename "$i");
    # Remove the .wasm extension from filename
    name_no_extension="${filename%.wasm}";
    # if ! command -v wasm-opt >/dev/null 2>&1; then
    #   echo '未找到 wasm-opt，请安装 Binaryen：brew install binaryen'
    #   exit 1
    # fi
    #wasm-opt -Oz --enable-bulk-memory --enable-nontrapping-float-to-int --output pkg/"$name_no_extension"_bg.wasm pkg/"$name_no_extension"_bg.wasm;

    #cp pkg/"$name_no_extension".js pkg/"$name_no_extension".js
done
