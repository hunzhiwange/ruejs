//! SWC 插件转换行为测试（spec14）
//!
//! 覆盖：useEffect 获取远程数据、ref 分支以及列表渲染的转换。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec14() {
    let src = r##"
import { FC, ref, useEffect } from '@rue-js/rue';

type CommitItem = {
  html_url: string;
  sha: string;
  author: { html_url: string };
  commit: { author: { name: string; date: string }; message: string };
};

const FetchingData: FC = () => {
  const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=3&sha=';
  const branches = ['main', 'beta', 'stable'] as const;
  const currentBranch = ref<typeof branches[number]>(branches[0]);
  const commits = ref<CommitItem[]>([]);

  const load = async (branch: string) => {
    const url = API_URL + branch;
    const res = await fetch(url);
    const data = await res.json();
    commits.value = Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    load(currentBranch.value);
  }, [currentBranch.value]);

  const truncate = (v: string) => {
    const newline = v.indexOf('\\n');
    return newline > 0 ? v.slice(0, newline) : v;
  };
  const formatDate = (v: string) => v.replace(/T|Z/g, ' ');

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <h1 className="text-2xl font-semibold">
          Latest rust-lang/rust Core Commits（移植自 Vue）
        </h1>
        <div className="flex items-center gap-4">
          {(['main', 'beta', 'stable'] as const).map(branch => (
            <label key={branch} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="branch"
                className="radio"
                value={branch}
                checked={currentBranch.value === branch}
                onChange={() => {
                  currentBranch.value = branch
                }}
              />
              <span className="select-none">{branch}</span>
            </label>
          ))}
        </div>
        <p className="text-gray-700">rust-lang/rust@{currentBranch.value}</p>
        {commits.value.length > 0 && (
          <ul className="space-y-4">
            {commits.value.map(({ html_url, sha, author, commit }) => (
              <li key={sha} className="leading-6">
                <a
                  href={html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="link link-primary"
                >
                  {sha.slice(0, 7)}
                </a>
                <span> - </span>
                <span className="font-medium">{truncate(commit.message)}</span>
                <br />
                <span>by </span>
                <span className="font-semibold">
                  {author && author.html_url ? (
                    <a
                      href={author.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="link link-hover"
                    >
                      {commit.author.name}
                    </a>
                  ) : (
                    <span>{commit.author.name}</span>
                  )}
                </span>
                <span> at </span>
                <span className="font-semibold">{formatDate(commit.author.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FetchingData;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec14.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));

    assert!(normalized.contains("useEffect"), "{normalized}");
    assert!(normalized.contains("_$compiledSetup"), "{normalized}");
    assert!(normalized.contains("_$reconcileKeyed"), "{normalized}");
    assert!(normalized.contains("_$mountCompiledKeyedRow"), "{normalized}");
    assert!(normalized.contains("const __rue_branch_value = commits.value.length > 0;"));
    assert!(
        normalized
            .contains("if (_$rowItem2.get().author && _$rowItem2.get().author.html_url) return")
    );
    assert!(normalized.contains("_$compiledValueFactory(_$rowItem2.get().commit.author.name)"));
    assert!(normalized.contains("_$compiledText(_el10, ()=>currentBranch.value)"));
    assert!(normalized.contains("_$compiledValueFactory(_$rowItem2.get().sha.slice(0, 7))"));
    assert!(normalized.contains("_$compiledValueFactory(truncate(__slot3))"));
    assert!(normalized.contains("_$compiledValueFactory(formatDate(__slot4))"));
}
