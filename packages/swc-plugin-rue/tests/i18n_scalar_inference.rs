use swc_plugin_rue::apply;
mod utils;

fn compile(source: &str) -> String {
    let (program, cm) = utils::parse(source, "test.tsx");
    utils::emit(apply(program), cm)
}

#[test]
fn infers_translation_calls_without_string_conversion() {
    for setup in [
        "const { _ } = useI18n();",
        "const { _: _ } = useI18n();",
        "const composer = useI18n(); const { _ } = composer;",
    ] {
        let out = compile(&format!(
            r#"
import {{ type FC }} from '@rue-js/rue';
import {{ useI18n }} from '@rue-js/i18n';
const App: FC = () => {{ {setup} return <span>{{_('hello')}}</span>; }};
"#
        ));
        assert!(!out.contains("String("), "{out}");
        assert!(!out.contains("_$mountCompiledValue"), "{out}");
        assert!(out.contains("_$compiledScalarText("), "{out}");
    }
}

#[test]
fn infers_renamed_import_and_member_calls() {
    let out = compile(
        r#"
import { type FC } from '@rue-js/rue';
import { useI18n as useMessages } from '@rue-js/i18n';
const App: FC = () => {
    const composer = useMessages();
    return <span>{composer._('hello')}{composer.n(123)}</span>;
};
"#,
    );
    assert!(out.contains("_$compiledScalarText("), "{out}");
    assert!(!out.contains("_$mountCompiledValue"), "{out}");
}

#[test]
fn unknown_and_shadowed_translators_keep_dynamic_rendering() {
    for source in [
        "import { useI18n } from './custom'; const App = () => { const { _ } = useI18n(); return <span>{_('hello')}</span>; };",
        "import { useI18n } from '@rue-js/i18n'; const App = (useI18n) => { const { _ } = useI18n(); return <span>{_('hello')}</span>; };",
        "import { useI18n } from '@rue-js/i18n'; const App = () => { let { _ } = useI18n(); _ = arbitrary; return <span>{_('hello')}</span>; };",
        "import { useI18n } from '@rue-js/i18n'; const App = () => { const { loadLocaleMessages } = useI18n(); return <span>{loadLocaleMessages('en')}</span>; };",
    ] {
        let out = compile(source);
        assert!(!out.contains("_$compiledScalarText("), "{out}");
    }
}

#[test]
fn layout_preserves_the_explicit_string_optimization() {
    let source = include_str!("../../../app/pages/site/components/Layout.tsx");
    assert!(!source.contains("String(_("));
    let explicit = source.replace("{_(", "{String(_(").replace("')}", "'))}");
    let inferred = compile(source);
    let explicit = compile(&explicit);
    for helper in ["_$compiledScalarText(", "_$compiledText(", "_$compiledValueFactory("] {
        assert_eq!(inferred.matches(helper).count(), explicit.matches(helper).count(), "{helper}");
    }
}
