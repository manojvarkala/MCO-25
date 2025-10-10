interface ChapterMeta {
    id: string;
    title: string;
}

export const tocContent = (chapters: ChapterMeta[]): string => `
    <p>This handbook serves as the definitive guide to the architecture, features, and administration of the Annapoorna Examination Engine. It is intended for administrators, content managers, and developers who will be managing, extending, or maintaining the platform.</p>
    <h3 class="text-xl font-bold mt-6">Part I: Platform Philosophy & Architecture</h3>
    <ul class="list-disc pl-5 mt-2 space-y-2">
        ${chapters.slice(2, 6).map(ch => `<li><a href="#" class="text-cyan-600 hover:underline" data-chapter-id="${ch.id}">${ch.title}</a></li>`).join('')}
    </ul>
    <h3 class="text-xl font-bold mt-6">Part II: The WordPress Backend</h3>
    <ul class="list-disc pl-5 mt-2 space-y-2">
        ${chapters.slice(6, 10).map(ch => `<li><a href="#" class="text-cyan-600 hover:underline" data-chapter-id="${ch.id}">${ch.title}</a></li>`).join('')}
    </ul>
    <h3 class="text-xl font-bold mt-6">Part III: The React Frontend</h3>
    <ul class="list-disc pl-5 mt-2 space-y-2">
        ${chapters.slice(10, 15).map(ch => `<li><a href="#" class="text-cyan-600 hover:underline" data-chapter-id="${ch.id}">${ch.title}</a></li>`).join('')}
    </ul>
    <h3 class="text-xl font-bold mt-6">Part IV: Administrator's Guide</h3>
    <ul class="list-disc pl-5 mt-2 space-y-2">
        ${chapters.slice(15).map(ch => `<li><a href="#" class="text-cyan-600 hover:underline" data-chapter-id="${ch.id}">${ch.title}</a></li>`).join('')}
    </ul>
`;
