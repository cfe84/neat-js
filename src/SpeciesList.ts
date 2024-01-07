import { Genome, MutationParameters, SpeciationCoefficients, Species } from "./index.js";
import { InnovationCounter } from "./InnovationCounter";
import { IEqualableAndStringifyable, pick } from "./utils.js";

export type CompeteResults = Record<string, number>;

export interface SpeciationParameters {
  innovationCounter: InnovationCounter,
  mutationParameters: MutationParameters,
  speciationCoefficients: SpeciationCoefficients,
  selectionCoefficients: SelectionCoefficients,
}

export class SpeciesList<T extends IEqualableAndStringifyable<T>> {

  private innovationCounter: InnovationCounter;
  private mutationParameters: MutationParameters;
  private speciationCoefficients: SpeciationCoefficients;
  private selectionCoefficients: SelectionCoefficients;
  constructor(
    public speciesList: Species<T>[],
    speciationParameters: SpeciationParameters) {
    this.innovationCounter = speciationParameters.innovationCounter;
    this.mutationParameters = speciationParameters.mutationParameters;
    this.speciationCoefficients = speciationParameters.speciationCoefficients;
    this.selectionCoefficients = speciationParameters.selectionCoefficients;
  }

  /**
   * Prune the species tree based on who's been a bad AI.
   * @param {CompeteResults} competeResults 
   * @param {Number} ageThreshold Threshold after which a species is old enough to be pruned.
   * @param {*} pruneFactor Proportion of individuals to keep.
   */
  prune(competeResults: CompeteResults, pruneFactor = .5) {
    // Looking at all results to eliminate stale species
    const allResults = Object
      .values(competeResults)
      .sort((a, b) => b - a) // Desc.
    const medianFitnessForAllGenomes = allResults[Math.floor(allResults.length * pruneFactor)]
    this.speciesList.forEach(species => {
      species.prune(competeResults, pruneFactor, this.selectionCoefficients.ageThreshold, medianFitnessForAllGenomes);
    })
    // Remove empty species.
    while (true) {
      const i = this.speciesList.findIndex((species) => species.genomes.length === 0);
      if (i < 0) {
        break
      }
      this.speciesList.splice(i, 1)
    }
  }


  /**
   * Add individuals to population by mating the remaining (therefore best) genomes.
   * @param {Genome[]} genomes 
   * @param {Number} targetPopulation How many genomes we want.
   * @param {InnovationCounter} innovation counter
   * @param {MutationCoefficients} mutationCoeffs
   */
  private repopulate(genomes: Genome<T>[], competeResults: CompeteResults) {
    const newGenomes = []
    while (genomes.length + newGenomes.length < this.selectionCoefficients.targetPopulation) {
      const genomeA = pick(genomes);
      const genomeB = pick(genomes);
      const fitnessDelta = competeResults[genomeA.genomeId] - competeResults[genomeB.genomeId];
      const matedGenome = genomeA.mate(genomeB, fitnessDelta, this.innovationCounter);
      const mutatedGenome = matedGenome.mutate(this.innovationCounter, this.mutationParameters);
      newGenomes.push(mutatedGenome)
    }
    genomes.push(...newGenomes)
  }

  /**
   * Find the best genome in a list
   * @param {Genome[]} genomes  
   * @returns 
   */
  private bestGenome(genomes: Genome<T>[], competeResults: CompeteResults) {
    return genomes.sort((a, b) => competeResults[b.genomeId] - competeResults[a.genomeId])[0]
  }

  /**
   * Group genomes into compatible species.
   * @param {Species[]} speciesList a list of species with their representative.
   * @param {Genome[]} genomes of the current pool.
   * @param {*} genomesAreCompatible function returning true if A and B are compatile.
   * @param {InnovationCounter} innovationCounter 
   */
  private groupIntoSpecies(genomes: Genome<T>[]) {
    this.speciesList.forEach(species => {
      species.representative = pick(species.genomes)
      species.genomes = []
    });
    genomes.forEach(genome => {
      for (let species of this.speciesList) {
        if (species.representative.isCompatibleWith(genome, this.speciationCoefficients)) {
          species.genomes.push(genome);
          genome.speciesId = species.id;
          return
        }
      }
      // No compatible species found
      this.speciesList.push(new Species(
        this.innovationCounter.nextSpecies(),
        [genome],
        genome
      ));
    })
  }

  public iterate(competeResults: CompeteResults) {
    this.speciesList.forEach(species => species.increaseAge());
    this.prune(competeResults);
    // Get a list of all genomes still alive
    const genomes = this.speciesList.reduce((genomes, species) =>
      genomes.concat(species.genomes), [] as Genome<T>[]);
    this.repopulate(genomes, competeResults);
    this.groupIntoSpecies(genomes);
  }
}

export interface SelectionCoefficients {
  ageThreshold: number,
  targetPopulation: number,
}