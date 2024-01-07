import { Genome, Link } from "./index.js";

declare module vis {
  class DataSet { constructor(_: any) }
  class Network { constructor(element: any, data: any, options: any) }
};

export class Visualization {
  /**
   * Converts a genome to text.
   * @param {Genome} genome 
   * @param {Boolean?} enabledOnly Display only enabled links (default = false)
   * @returns HTML explanation of the links and neurons of the Genome.
   */
  static explainGenome(genome: Genome<any>, enabledOnly: boolean = false) {
    return `Genome ${genome.genomeId} | Species ${genome.speciesId}: <p style="text-align: left">
    ` + genome.links.filter(g => g.enabled || !enabledOnly).map(link => `
    <span style="border: 1pt solid; display: inline-block; width: 120px; padding: 2px; padding-top: 4px; margin: 2px; ; text-align: center">
    <span style="display: block; border-bottom: 1pt solid; margin-left: 4px; margin-right: 4px">
    <b>#${link.innovationId}</b>
    </span>
    ${link.from.id} -> ${link.to.id}<br/>
    Weight: ${Math.round(link.weight * 100) / 100}<br/>
    ${link.enabled ? "." : "DISABLED"}x
    </span>`).join("") + "</p>"
  }

  /**
   * Convert a Genome to graph.
   * @param {Genome} genome to render.
   * @param {HTMLElement} element on which to render genome.
   * @param {boolean} enabledOnly display only enabled links and neurons.
   */
  static genomeToGraph(genome: Genome<any>, element: HTMLElement, enabledOnly: boolean = false) {
    let neurons: any[] = []
    let links: any[] = []
    function linkToGraph(link: Link<any>) {
      const fromLabel = link.from.id
      const toLabel = link.to.id
      let fromId = neurons.findIndex(neuron => neuron.label === fromLabel)
      let toId = neurons.findIndex(neuron => neuron.label === toLabel)
      if (toId < 0) {
        neurons.push({ id: neurons.length, label: toLabel, group: link.to.type })
        toId = neurons.length - 1
      }
      if (fromId < 0) {
        neurons.push({ id: neurons.length, label: fromLabel, group: link.from.type })
        fromId = neurons.length - 1
      }
      links.push({ from: fromId, to: toId, label: `${Math.round(link.weight * 100) / 100}`, color: (link.enabled ? link.weight > 0 ? "green" : "red" : "gray"), arrows: { to: { enabled: true } } })
    }
    genome.links
      .filter(link => !enabledOnly || link.enabled)
      .forEach(link => {
        linkToGraph(link)
      })
    const data = {
      nodes: new vis.DataSet(neurons),
      edges: new vis.DataSet(links)
    }
    const options = {
      groups: {
        "in": { color: { border: "red" } },
        "out": { color: { border: "blue" } }
      },
    }
    const network = new vis.Network(element, data, options)
  }
}