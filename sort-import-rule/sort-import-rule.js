'use strict';
const noParentBlock = (node) => {
    if (node.parent) {
        if (node.parent.type === 'BlockStatement') return false;
        return noParentBlock(node.parent);
    }
    return true;
};
const filter = (nodes) => nodes.filter((node) => (node.type === 'ImportDeclaration'
    || node.type === 'VariableDeclaration' && noParentBlock(node)));

function getUnsorted(nodes, sorted) {
    return nodes.find((node, i) => node !== sorted[i]);
}

const range = {
    start: (node) => node.range[0],
    end: (node) => node.range[1],
};
const getTextBetween = (left, right) => [
    range.start(left),
    range.end(right),
];

const getRange = (source, node) => getTextBetween(source.getCommentsBefore(node)[0] || node, node);
const getText = (source, node) => source.getText().slice(...getRange(source, node));

function getName(node) {
    switch (node.type) {
        case "Identifier":
        case "PrivateIdentifier":
            return node.name;
        case "Literal":
            return node.value.toString();
        case "TemplateLiteral":
            return node.quasis.reduce((acc, quasi, i) => acc + quasi.value.raw + getName(node.expressions[i]), "");
    }
    return "";
}

const getSource = (node) => {
    if (node.type === 'ImportDeclaration') return getName(node.source);
    return "a";
};
const sortGroups = [
    {
        order: 1,
        type: "alias",
        regex: /^@/
    },
    {
        order: 2,
        type: "npm",
        regex: /^\w/
    },
    {
        order: 3,
        type: "relative-no-dotes",
        regex: /^\.\.$|^\.\.[\\/]/
    },
    {
        order: 4,
        type: "relative-with-dotes",
        regex: /^\.[\\/]?/
    },
    {
        order: 5,
        type: "dynamic",
        regex: /import\(/
    }
];

function getOrder(node) {
    let source;
    if (node.type === 'ImportDeclaration') source = getName(node.source);
    else return 5;
    for (const {order, regex} of sortGroups) {
        if (source.match(regex)) return order;
    }
    return 0;
}

module.exports = {
    meta: {
        fixable: "code",
        messages: {
            unsorted: "Imports are unsorted.",
            extraNewlines: "Empty lines inside one block",
            noEmptyLine: "Between two blocks should be empty line"
        },
    },
    create(context) {
        const source = context.getSourceCode();
        return {
            Program(program) {
                const nodes = filter(program.body);
                if (nodes.length < 2)
                    return;
                const sorted = nodes.slice().sort((a, b) => getOrder(a) - getOrder(b) ||
                    getSource(a).localeCompare(getSource(b)));
                const first = getUnsorted(nodes, sorted);
                if (first) {
                    console.log("there")
                    context.report({
                        node: first,
                        messageId: "unsorted",
                        * fix(fixer) {
                            for (let i = 0; i < nodes.length; i++) {
                                let node = nodes[i];
                                let comp = sorted[i];
                                yield fixer.replaceTextRange(getRange(source, node), getText(source, comp));
                            }
                        }
                    });
                }
                const text = source.getText();
                for (let i = 1; i < nodes.length; i++) {
                    const node = nodes[i];
                    const prevNode = nodes[i - 1];
                    const com = source.getCommentsBefore(node)[0];
                    let nodeOrComment = node;
                    if (com) nodeOrComment = com;
                    const currentRange = [
                        range.end(prevNode),
                        range.start(nodeOrComment),
                    ];
                    const separator = text
                        .slice(...currentRange)
                        .replace(/[^\n]/g, "")
                        .replace("\n", "");
                    const startLine = (prevNode.loc.end.line) + 1;
                    const endLine = (nodeOrComment.loc.start.line) - 1;
                    const loc = {
                        start: {line: startLine, column: 0},
                        end: {line: Math.max(endLine, startLine), column: 0},
                    };
                    const isSameGroup = getOrder(sorted[i-1]) === getOrder(sorted[i]);
                    if (isSameGroup) {
                        if (separator !== "") {
                            context.report({
                                messageId: "extraNewlines",
                                loc,
                                fix: (fixer) => fixer.replaceTextRange(currentRange, "\n"),
                            });
                        }
                    } else if (separator === "") {
                        context.report({
                            messageId: "noEmptyLine",
                            loc,
                            fix: (fixer) => fixer.replaceTextRange(currentRange, "\n\n"),
                        });
                    }
                }
            }
        };
    }
};
