import ts from 'typescript';

/** Catch accidental busy loops in authored preview code; this is not a hostile-code CPU sandbox. */
export const scriptBudget =
  (source: string): ts.TransformerFactory<ts.SourceFile> =>
  (context) => {
    const name = `__framekitWorkBudget${source.length}`;
    const check = (): ts.Statement =>
      ts.factory.createExpressionStatement(
        ts.factory.createCallExpression(ts.factory.createIdentifier(name), undefined, []),
      );
    const body = (statement: ts.Statement): ts.Block =>
      ts.factory.createBlock(
        [check(), ...(ts.isBlock(statement) ? statement.statements : [statement])],
        true,
      );
    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      const next = ts.visitEachChild(node, visit, context);

      if (ts.isForStatement(next)) {
        return ts.factory.updateForStatement(
          next,
          next.initializer,
          next.condition,
          next.incrementor,
          body(next.statement),
        );
      }
      if (ts.isForOfStatement(next)) {
        return ts.factory.updateForOfStatement(
          next,
          next.awaitModifier,
          next.initializer,
          next.expression,
          body(next.statement),
        );
      }
      if (ts.isForInStatement(next)) {
        return ts.factory.updateForInStatement(
          next,
          next.initializer,
          next.expression,
          body(next.statement),
        );
      }
      if (ts.isWhileStatement(next)) {
        return ts.factory.updateWhileStatement(next, next.expression, body(next.statement));
      }
      if (ts.isDoStatement(next)) {
        return ts.factory.updateDoStatement(next, body(next.statement), next.expression);
      }
      return next;
    };

    return (file) =>
      ts.factory.updateSourceFile(file, [
        ts.factory.createVariableStatement(
          undefined,
          ts.factory.createVariableDeclarationList(
            [
              ts.factory.createVariableDeclaration(
                name,
                undefined,
                undefined,
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createCallExpression(
                    ts.factory.createIdentifier('require'),
                    undefined,
                    [ts.factory.createStringLiteral('@framekit/budget')],
                  ),
                  'check',
                ),
              ),
            ],
            ts.NodeFlags.Const,
          ),
        ),
        ...file.statements.map((statement) => ts.visitNode(statement, visit) as ts.Statement),
      ]);
  };
