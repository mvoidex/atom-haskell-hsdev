"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SelectListView = require("atom-select-list");
async function importListView(imports) {
    let panel;
    let res;
    try {
        res = await new Promise((resolve) => {
            const select = new SelectListView({
                items: imports,
                itemsClassList: ['ide-haskell'],
                elementForItem: (item) => {
                    const li = document.createElement('li');
                    li.innerText = `${item}`;
                    return li;
                },
                didCancelSelection: () => {
                    resolve();
                },
                didConfirmSelection: (item) => {
                    resolve(item);
                },
            });
            select.element.classList.add('ide-haskell');
            panel = atom.workspace.addModalPanel({
                item: select,
                visible: true,
            });
            select.focus();
        });
    }
    finally {
        panel && panel.destroy();
    }
    return res;
}
exports.importListView = importListView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0LWxpc3Qtdmlldy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92aWV3cy9pbXBvcnQtbGlzdC12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbURBQW1EO0FBRzVDLEtBQUsseUJBQ1YsT0FBaUI7SUFFakIsSUFBSSxLQUFnRCxDQUFBO0lBQ3BELElBQUksR0FBdUIsQ0FBQTtJQUMzQixJQUFJLENBQUM7UUFDSCxHQUFHLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBcUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN0RCxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQztnQkFDaEMsS0FBSyxFQUFFLE9BQU87Z0JBRWQsY0FBYyxFQUFFLENBQUMsYUFBYSxDQUFDO2dCQUMvQixjQUFjLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRTtvQkFDL0IsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDdkMsRUFBRSxDQUFDLFNBQVMsR0FBRyxHQUFHLElBQUksRUFBRSxDQUFBO29CQUN4QixNQUFNLENBQUMsRUFBRSxDQUFBO2dCQUNYLENBQUM7Z0JBQ0Qsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO29CQUN2QixPQUFPLEVBQUUsQ0FBQTtnQkFDWCxDQUFDO2dCQUNELG1CQUFtQixFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUU7b0JBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDZixDQUFDO2FBQ0YsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQzNDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQztnQkFDbkMsSUFBSSxFQUFFLE1BQU07Z0JBQ1osT0FBTyxFQUFFLElBQUk7YUFDZCxDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO1lBQVMsQ0FBQztRQUNULEtBQUssSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUNELE1BQU0sQ0FBQyxHQUFHLENBQUE7QUFDWixDQUFDO0FBbENELHdDQWtDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTZWxlY3RMaXN0VmlldyA9IHJlcXVpcmUoJ2F0b20tc2VsZWN0LWxpc3QnKVxyXG5pbXBvcnQgeyBQYW5lbCB9IGZyb20gJ2F0b20nXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0TGlzdFZpZXcoXHJcbiAgaW1wb3J0czogc3RyaW5nW10sXHJcbik6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XHJcbiAgbGV0IHBhbmVsOiBQYW5lbDxTZWxlY3RMaXN0VmlldzxzdHJpbmc+PiB8IHVuZGVmaW5lZFxyXG4gIGxldCByZXM6IHN0cmluZyB8IHVuZGVmaW5lZFxyXG4gIHRyeSB7XHJcbiAgICByZXMgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+KChyZXNvbHZlKSA9PiB7XHJcbiAgICAgIGNvbnN0IHNlbGVjdCA9IG5ldyBTZWxlY3RMaXN0Vmlldyh7XHJcbiAgICAgICAgaXRlbXM6IGltcG9ydHMsXHJcbiAgICAgICAgLy8gaW5mb01lc3NhZ2U6IGhlYWRpbmcsXHJcbiAgICAgICAgaXRlbXNDbGFzc0xpc3Q6IFsnaWRlLWhhc2tlbGwnXSxcclxuICAgICAgICBlbGVtZW50Rm9ySXRlbTogKGl0ZW06IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXHJcbiAgICAgICAgICBsaS5pbm5lclRleHQgPSBgJHtpdGVtfWBcclxuICAgICAgICAgIHJldHVybiBsaVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGlkQ2FuY2VsU2VsZWN0aW9uOiAoKSA9PiB7XHJcbiAgICAgICAgICByZXNvbHZlKClcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRpZENvbmZpcm1TZWxlY3Rpb246IChpdGVtOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgIHJlc29sdmUoaXRlbSlcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG4gICAgICBzZWxlY3QuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdpZGUtaGFza2VsbCcpXHJcbiAgICAgIHBhbmVsID0gYXRvbS53b3Jrc3BhY2UuYWRkTW9kYWxQYW5lbCh7XHJcbiAgICAgICAgaXRlbTogc2VsZWN0LFxyXG4gICAgICAgIHZpc2libGU6IHRydWUsXHJcbiAgICAgIH0pXHJcbiAgICAgIHNlbGVjdC5mb2N1cygpXHJcbiAgICB9KVxyXG4gIH0gZmluYWxseSB7XHJcbiAgICBwYW5lbCAmJiBwYW5lbC5kZXN0cm95KClcclxuICB9XHJcbiAgcmV0dXJuIHJlc1xyXG59XHJcbiJdfQ==