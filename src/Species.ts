import { Genome, CompeteResults } from "./index.js";
import { IEqualableAndStringifyable } from "./utils.js";

export class Species<T extends IEqualableAndStringifyable<T>> {
  private _age = 0;
  constructor(public id: number, public genomes: Genome<T>[], public representative: Genome<T>) { }

  increaseAge() {
    this._age++;
  }

  prune(competeResults: CompeteResults, pruneFactor: number, ageThreshold: number, medianFitnessForAllGenomes: number) {
    this.genomes = this.genomes.sort((a, b) => competeResults[b.genomeId] - competeResults[a.genomeId]);
    // Cull the worst of this this.
    this.genomes.splice(this.genomes.length * pruneFactor + 1);
    if (this.genomes.length > 0
      && this._age >= ageThreshold // We spare younger species from genocide
      // to give them a chance
    ) {
      const medianGenomeForThisSpecies = this.genomes[Math.floor(this.genomes.length * pruneFactor)];
      const medianFitnessForThisSpecies = competeResults[medianGenomeForThisSpecies.genomeId];
      // If median fitness is dumber than overall median, we kill the species altogether
      if (medianFitnessForThisSpecies < medianFitnessForAllGenomes) {
        this.genomes = [];
      }
    }
  }
}