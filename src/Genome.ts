import { InnovationCounter } from "./InnovationCounter.js";
import { Link, Neuron, neuronTypes } from "./index.js";
import { IEqualableAndStringifyable, pick } from "./utils.js";

const MATING_TOLERANCE = 0.01

export const logisticActivationFunction = (inboundSignal: number) => {
  return 1 / (1 + Math.exp(-inboundSignal))
}

export type InputValueAdapter<T> = (neuronValue: T) => number;

export class Genome<T extends IEqualableAndStringifyable<T>> {
  constructor(
    public genomeId: number,
    public speciesId: number,
    public neurons: Neuron<T>[],
    public links: Link<T>[],
  ) { }

  /**
   * Reduces the genome into a function that processes input and generates output
   * for a given neuron
   * @param {Link[]} links of the neural network
   * @param {number} neuronId of the neuron.
   * @returns A function that takes an InputValueAdapter and returns a number corresponding to neuron excitation
   */
  private reduceGenomeForNeuron(neuronId: number) {
    const linksToThisNeuron = this.links.filter(link => link.to.neuronInnovationId === neuronId && link.enabled)
    // We get a series of functions for all the inputs to which we can
    // pass the board and get activation value in return
    const inboundSignals = linksToThisNeuron.map(link => {
      if (link.from.type === neuronTypes.in) {
        // Input neurons are simply the value on the board (* link weight)
        return (inputValueAdapter: InputValueAdapter<T>): number => inputValueAdapter(link.from.value) * link.weight
      } else {
        // Hidden neuron is the value of the reduction (* link weight)
        const f = this.reduceGenomeForNeuron(link.from.neuronInnovationId);
        return (inputValueAdapter: InputValueAdapter<T>): number => f(inputValueAdapter) * link.weight;
      }
    })
    return (inputValueAdapter: InputValueAdapter<T>) => {
      // Sum all inbound signals and activate
      const inboundSignal = inboundSignals.reduce((agg, f) => agg + f(inputValueAdapter), 0)
      return inboundSignal > 0 ? logisticActivationFunction(inboundSignal) : 0
    }
  }

  /**
   * Reduce genome, output as an object that gives output values for each of the inputs.
   * @param outputNeuronKeyProvider A function returning the key for a given neuron in the reduced dictionary. Defaults to .toString() for the value
   * @returns 
   */
  public reduce(outputNeuronKeyProvider?: (t: T) => string) {
    const outputNeurons = this.neurons.filter(neuron => neuron.type === neuronTypes.out);
    const res: Record<string, (InputValueAdapter: InputValueAdapter<T>) => number> = {};
    outputNeurons.forEach(outputNeuron => {
      res[outputNeuronKeyProvider ? outputNeuronKeyProvider(outputNeuron.value) : outputNeuron.value.toString()]
        = this.reduceGenomeForNeuron(outputNeuron.neuronInnovationId);
    });
    return res;
  }

  /**
   * Clone a genome.
   * @param {Genome} genome to clone
   * @returns a new genome corresponding to the first one.
   */
  public clone(): Genome<T> {
    const cloned: Genome<T> = new Genome(
      this.genomeId,
      this.speciesId,
      [...this.neurons],
      []
    );
    this.links.forEach(link => {
      cloned.links.push(link.clone())
    })
    return cloned
  }

  /**
   * Randomly mutate a genome
   * @param {InnovationCounter} innovationCounter Innovation counter object
   * @param {MutationParameters} mutationParameters An object with mutation parameters.
   * @returns A clone of the original genome with mutations.
   */
  public mutate(innovationCounter: InnovationCounter, mutationParameters: MutationParameters) {
    const { mutateWeight, mutateEnabled, mutateDisabled, mutateSplit, mutateInsert } = mutationParameters
    const mutatedGenome = this.clone();
    const newLinks: Link<T>[] = []
    mutatedGenome.links.forEach(link => {
      // mutate weights
      if (Math.random() < mutateWeight) {
        link.weight = Math.random() * 2 - 1
      }
      // disable links
      if (Math.random() < mutateDisabled && link.enabled) {
        link.enabled = false
      }
      // enable links
      if (Math.random() < mutateEnabled && !link.enabled) {
        link.enabled = true
      }
      // split links
      if (Math.random() < mutateSplit) {
        link.enabled = false;
        const newNeuron = Neuron.createHiddenNeuron(-1) as any as Neuron<T>;
        const innovation = innovationCounter.innovationForLinkSplit(link.from, link.to, newNeuron);
        newNeuron.neuronInnovationId = innovation.neuron;
        // We check if that neuron doesn't already exist
        // we need only check the first link because if it's
        // there, the second always is, since that neuron id
        // ALWAYS gets inserted in that exact position.
        if (!mutatedGenome.links.find((existingLink: Link<T>) => existingLink.innovationId === innovation.firstLink)) {
          newLinks.push(new Link(
            innovation.firstLink,
            link.from,
            newNeuron,
            1,
            true,
          ));
          newLinks.push(new Link(
            innovation.secondLink,
            newNeuron,
            link.to,
            link.weight,
            true,
          ));
        }
      }
    })
    // insert new links
    if (Math.random() < mutateInsert) {
      const fromNeuron = pick(mutatedGenome.neurons.filter(neuron => neuron.type === neuronTypes.in
        || neuron.type === neuronTypes.hidden))
      const toNeuron = pick(mutatedGenome.neurons.filter(neuron => neuron.type === neuronTypes.out
        || neuron.type === neuronTypes.hidden))
      const innovation = innovationCounter.innovationForNewLink(fromNeuron, toNeuron)
      // We check if that link doesn't already exist
      if (!mutatedGenome.links.find((existingLink) => existingLink.innovationId === innovation) &&
        fromNeuron !== toNeuron &&
        // we also check for cycles, graph needs to be directed
        !graphContainsCycle(mutatedGenome.links, toNeuron, fromNeuron)) {
        newLinks.push(new Link(
          innovation,
          fromNeuron,
          toNeuron,
          Math.random() * 2 - 1,
          true,
        ));
      }
      // We check if it doesn't create a loop
    }
    mutatedGenome.links = mutatedGenome.links.concat(newLinks)
    return mutatedGenome
  }

  /**
   * Mate two genomes, returns the offspring
   * @param {Genome} mateWith Second genome to mate.
   * @param {Number} fitnessDelta f(g1) - f(g2)
   * @param {InnovationCounter} innovation 
   * @returns a new genome resulting from the mating of the two original genomes.
   */
  public mate(mateWith: Genome<T>, fitnessDelta: number, innovation: InnovationCounter) {
    // fitness delta is 
    let genePool = this.links.map(link => link.innovationId)
    mateWith.links.forEach(link => {
      if (genePool.indexOf(link.innovationId) < 0) {
        genePool.push(link.innovationId)
      }
    })
    genePool = genePool.sort()
    const child = new Genome(
      innovation.nextGenome(),
      -2,
      [] as Neuron<T>[],
      [] as Link<T>[],
    );
    // Push all common nodes
    child.neurons.push(...this.neurons.filter(neuron => mateWith.neurons.indexOf(neuron) >= 0))
    genePool.forEach(innovationId => {
      const gene1 = this.links.find(gene => gene.innovationId === innovationId)
      const gene2 = mateWith.links.find(gene => gene.innovationId === innovationId)
      let selectedGene
      if (gene1 && gene2) {
        selectedGene = pick([gene1, gene2])
      } else if (fitnessDelta >= -MATING_TOLERANCE && gene1) {
        selectedGene = gene1
      } else if (fitnessDelta <= MATING_TOLERANCE && gene2) {
        selectedGene = gene2
      }
      if (selectedGene) {
        if (child.neurons.indexOf(selectedGene.from) < 0) {
          child.neurons.push(selectedGene.from)
        }
        if (child.neurons.indexOf(selectedGene.to) < 0) {
          child.neurons.push(selectedGene.to)
        }
        child.links.push(selectedGene.clone())
      }
    })
    return child
  }

  /**
   * Calculates the distance between 
   * @param {*} otherGenome 
   * @param {*} coefficients Coefficients to be applied when calculating the distance
   * @returns 
   */
  public genomialDistance(otherGenome: Genome<T>, coefficients: SpeciationCoefficients) {
    const { disjointCoeff, excessCoeff, weightCoeff } = coefficients
    let disjoint = 0
    let excess = 0
    let weightDeltas = 0
    let matchingGenes = 0
    let maxInnovationthis = 0
    let maxInnovationotherGenome = 0
    // List all enabled links in genome A, find max innovation
    let thisLinks = this.links
      .filter(link => link.enabled)
      .map(link => {
        if (maxInnovationthis < link.innovationId) {
          maxInnovationthis = link.innovationId
        }
        return link
      })
    // list all enabled links in genome B, find max innovation as well.
    otherGenome.links.filter(gene => gene.enabled).forEach(link => {
      if (link.innovationId > maxInnovationotherGenome) {
        maxInnovationotherGenome = link.innovationId
      }
      const index = thisLinks.findIndex(linkA => linkA.innovationId === link.innovationId && linkA.enabled)
      if (index < 0) {
        if (link.innovationId > maxInnovationthis) {
          excess++
        } else {
          disjoint++
        }
      } else {
        const geneA = thisLinks[index]
        matchingGenes++
        weightDeltas += Math.abs(geneA.weight - link.weight)
        thisLinks.splice(index, 1)
      }
    })
    // these are all genes not found in genome B
    thisLinks.forEach(link => {
      if (link.innovationId > maxInnovationotherGenome) {
        excess++
      } else {
        disjoint++
      }
    })
    // We use the max number of enabled genes in the genome as gene pool.
    const genePoolSize = Math.max(1, this.links.filter(link => link.enabled).length, otherGenome.links.filter(link => link.enabled).length)
    return (matchingGenes ? weightCoeff * weightDeltas / matchingGenes : 0) +
      excessCoeff * excess / genePoolSize +
      disjointCoeff * disjoint / genePoolSize
  }

  public isCompatibleWith(otherGenome: Genome<T>, speciationCoeffs: SpeciationCoefficients) {
    return this.genomialDistance(otherGenome, speciationCoeffs) > speciationCoeffs.speciationThreshold;
  }
}

/**
 * Recursively detects cycles in a neural network
 * @param {Link[]} links of the network
 * @param {Neuron} neuron Any neuron that can 
 * @param {Neuron} originNeuron Neuron from which we're starting to search for graphs.
 * @returns True if there's a cycle.
 */
function graphContainsCycle<T extends IEqualableAndStringifyable<T>>(links: Link<any>[], neuron: Neuron<T>, originNeuron: Neuron<T>): boolean {
  if (neuron === originNeuron) {
    return true
  }
  const nextNeurons = links.filter(link => link.from === neuron).map(link => link.to)
  if (nextNeurons.length === 0) {
    return false
  }
  return nextNeurons.map(neuron => graphContainsCycle(links, neuron, originNeuron)).indexOf(true) >= 0
}

export interface MutationParameters {
  /**
   * Chance that weight gets mutated.
   */
  mutateWeight: number,
  /**
   * Chance that link gets enabled.
   */
  mutateEnabled: number,
  /**
   * Chance that link gets disabled.
   */
  mutateDisabled: number,
  /**
   * Chance that link gets split
   */
  mutateSplit: number,
  /**
   * Chance that a new link gets inserted.
   */
  mutateInsert: number,
}

export interface SpeciationCoefficients {
  disjointCoeff: number;
  excessCoeff: number;
  weightCoeff: number;
  speciationThreshold: number;
}