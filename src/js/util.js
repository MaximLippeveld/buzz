import * as d3 from 'd3';

export const hashCode = function(s) {
    if (s == null) {
        return 0
    }
    const code =  s.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
    }, 0);
    return code
};
export const webglColor = function(color, opacity) {
    const { r, g, b, o } = d3.color(color).rgb();
    return [r / 255, g / 255, b / 255, opacity];
};
export const search = async function(id, tree, [[x0, y0], [x3, y3]]) {
    var found = 0;
    tree.visit((node, x1, y1, x2, y2) => {
        if (!node.length) {
            do {
                const d = node.data;
                const x = node.data.dim_1;
                const y = node.data.dim_2;
                if (x >= x0 && x < x3 && y >= y0 && y < y3) {
                    found++;
                    d.selected = id;
                }
            } while ((node = node.next));
        }
        return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
    });
    return found;
}