export const TECH_ICONS_GLOB = import.meta.glob('../assets/tech-icons-svg/*.svg', {
    eager: true,
    as: 'url',
})

export interface TechIcon {
    name: string
    url: string
}

export const TECH_ICONS: TechIcon[] = Object.entries(TECH_ICONS_GLOB).map(([path, url]) => {
    // Extract filename without extension as the name
    const name = path.split('/').pop()?.replace('.svg', '').replace(/-/g, ' ') || 'Icon'
    return { name, url }
}).sort((a, b) => a.name.localeCompare(b.name))
