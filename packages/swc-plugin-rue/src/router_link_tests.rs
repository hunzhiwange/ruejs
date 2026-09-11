use super::*;
use std::sync::Arc;
use swc_core::common::{FileName, SourceMap};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_jsx_element(src: &str) -> JSXElement {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("router-link-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    match *parser.parse_expr().expect("parse jsx element") {
        Expr::JSXElement(el) => *el,
        other => panic!("expected JSXElement, got {other:?}"),
    }
}

#[test]
fn preserves_router_links_for_container_scoped_component_navigation() {
    for source in [
        r#"<RouterLink to="/docs">Docs</RouterLink>"#,
        r#"<RouterLink to={target.href} replace prefetch="hover" />"#,
        r#"<RouterLink {...props} />"#,
        r#"<Router.Link to="/docs" />"#,
        r#"<router-link to="/docs" />"#,
    ] {
        let element = parse_jsx_element(source);
        assert!(rewrite_router_link_fast_path(&element).is_none(), "{source}");
    }
}
