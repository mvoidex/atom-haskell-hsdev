"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const atom_haskell_utils_1 = require("atom-haskell-utils");
class BufferInfo {
    constructor(buffer) {
        this.buffer = buffer;
        this.oldText = '';
        this.oldImports = { name: 'Main', imports: [] };
        this.destroy = () => {
            this.disposables.dispose();
        };
        this.disposables = new atom_1.CompositeDisposable();
        this.disposables.add(this.buffer.onDidDestroy(this.destroy));
    }
    async getImports() {
        const parsed = await this.parse();
        const imports = parsed ? parsed.imports : [];
        if (!imports.some(({ name }) => name === 'Prelude')) {
            imports.push({
                qualified: false,
                hiding: false,
                name: 'Prelude',
                importList: null,
                alias: null,
            });
        }
        return imports;
    }
    async getModuleName() {
        const parsed = await this.parse();
        return parsed.name;
    }
    async parse() {
        const newText = this.buffer.getText();
        if (this.oldText === newText) {
            return this.oldImports;
        }
        else {
            this.oldText = newText;
            this.oldImports = await atom_haskell_utils_1.parseHsModuleImports(this.buffer.getText());
            return this.oldImports;
        }
    }
}
exports.BufferInfo = BufferInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyLWluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tcGxldGlvbi1iYWNrZW5kL2J1ZmZlci1pbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQXNEO0FBQ3RELDJEQUFrRjtBQUtsRjtJQUtFLFlBQTRCLE1BQWtCO1FBQWxCLFdBQU0sR0FBTixNQUFNLENBQVk7UUFIdEMsWUFBTyxHQUFXLEVBQUUsQ0FBQTtRQUNwQixlQUFVLEdBQW1CLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUE7UUFTM0QsWUFBTyxHQUFHLEdBQUcsRUFBRTtZQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzVCLENBQUMsQ0FBQTtRQVJDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSwwQkFBbUIsRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFRTSxLQUFLLENBQUMsVUFBVTtRQUNyQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNqQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUU1QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BELE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1gsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE1BQU0sRUFBRSxLQUFLO2dCQUNiLElBQUksRUFBRSxTQUFTO2dCQUNmLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixLQUFLLEVBQUUsSUFBSTthQUNaLENBQUMsQ0FBQTtRQUNKLENBQUM7UUFFRCxNQUFNLENBQUMsT0FBTyxDQUFBO0lBQ2hCLENBQUM7SUFFTSxLQUFLLENBQUMsYUFBYTtRQUN4QixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQTtJQUNwQixDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUs7UUFDakIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNyQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDN0IsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDeEIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7WUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLHlDQUFvQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUNuRSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUN4QixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBaERELGdDQWdEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvc2l0ZURpc3Bvc2FibGUsIFRleHRCdWZmZXIgfSBmcm9tICdhdG9tJ1xyXG5pbXBvcnQgeyBwYXJzZUhzTW9kdWxlSW1wb3J0cywgSU1vZHVsZUltcG9ydHMsIElJbXBvcnQgfSBmcm9tICdhdG9tLWhhc2tlbGwtdXRpbHMnXHJcbmltcG9ydCAqIGFzIENCIGZyb20gJ2F0b20taGFza2VsbC11cGkvY29tcGxldGlvbi1iYWNrZW5kJ1xyXG5cclxuZXhwb3J0IHsgSUltcG9ydCB9XHJcblxyXG5leHBvcnQgY2xhc3MgQnVmZmVySW5mbyB7XHJcbiAgcHJpdmF0ZSBkaXNwb3NhYmxlczogQ29tcG9zaXRlRGlzcG9zYWJsZVxyXG4gIHByaXZhdGUgb2xkVGV4dDogc3RyaW5nID0gJydcclxuICBwcml2YXRlIG9sZEltcG9ydHM6IElNb2R1bGVJbXBvcnRzID0geyBuYW1lOiAnTWFpbicsIGltcG9ydHM6IFtdIH1cclxuXHJcbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGJ1ZmZlcjogVGV4dEJ1ZmZlcikge1xyXG4gICAgdGhpcy5kaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKClcclxuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKHRoaXMuYnVmZmVyLm9uRGlkRGVzdHJveSh0aGlzLmRlc3Ryb3kpKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGNvbXBsZXRpb25zOiBDQi5JU3ltYm9sW10gfCB1bmRlZmluZWRcclxuXHJcbiAgcHVibGljIGRlc3Ryb3kgPSAoKSA9PiB7XHJcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIGdldEltcG9ydHMoKTogUHJvbWlzZTxJSW1wb3J0W10+IHtcclxuICAgIGNvbnN0IHBhcnNlZCA9IGF3YWl0IHRoaXMucGFyc2UoKVxyXG4gICAgY29uc3QgaW1wb3J0cyA9IHBhcnNlZCA/IHBhcnNlZC5pbXBvcnRzIDogW11cclxuICAgIC8vIHRzbGludDpkaXNhYmxlOiBuby1udWxsLWtleXdvcmRcclxuICAgIGlmICghaW1wb3J0cy5zb21lKCh7IG5hbWUgfSkgPT4gbmFtZSA9PT0gJ1ByZWx1ZGUnKSkge1xyXG4gICAgICBpbXBvcnRzLnB1c2goe1xyXG4gICAgICAgIHF1YWxpZmllZDogZmFsc2UsXHJcbiAgICAgICAgaGlkaW5nOiBmYWxzZSxcclxuICAgICAgICBuYW1lOiAnUHJlbHVkZScsXHJcbiAgICAgICAgaW1wb3J0TGlzdDogbnVsbCxcclxuICAgICAgICBhbGlhczogbnVsbCxcclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIC8vIHRzbGludDplbmFibGU6IG5vLW51bGwta2V5d29yZFxyXG4gICAgcmV0dXJuIGltcG9ydHNcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBnZXRNb2R1bGVOYW1lKCk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBjb25zdCBwYXJzZWQgPSBhd2FpdCB0aGlzLnBhcnNlKClcclxuICAgIHJldHVybiBwYXJzZWQubmFtZVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwYXJzZSgpOiBQcm9taXNlPElNb2R1bGVJbXBvcnRzPiB7XHJcbiAgICBjb25zdCBuZXdUZXh0ID0gdGhpcy5idWZmZXIuZ2V0VGV4dCgpXHJcbiAgICBpZiAodGhpcy5vbGRUZXh0ID09PSBuZXdUZXh0KSB7XHJcbiAgICAgIHJldHVybiB0aGlzLm9sZEltcG9ydHNcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMub2xkVGV4dCA9IG5ld1RleHRcclxuICAgICAgdGhpcy5vbGRJbXBvcnRzID0gYXdhaXQgcGFyc2VIc01vZHVsZUltcG9ydHModGhpcy5idWZmZXIuZ2V0VGV4dCgpKVxyXG4gICAgICByZXR1cm4gdGhpcy5vbGRJbXBvcnRzXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==