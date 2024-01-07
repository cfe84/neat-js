declare function LineChart(dataset: any, opts: any): HTMLElement;

export class FitnessDiagram {
  private elt: HTMLElement | null = null;
  private opts: any;

  constructor(private element: HTMLElement) {
    element.innerHTML = "";
    this.opts = {
      x: (d: any) => d.generation,
      y: (d: any) => d.fitness,
      yLabel: "Fitness",
      height: element.style.height,
      width: element.style.width,
      color: "steelblue"
    };
  }

  updateFitness(fitnessOverTime: any) {
    // check if new?
    const chart = LineChart(fitnessOverTime, this.opts);
    if (this.elt) {
      this.element.removeChild(this.elt);
    }
    this.elt = chart;
    this.element.appendChild(chart);
  }
}