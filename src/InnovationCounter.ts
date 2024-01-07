import { Neuron } from "./index.js"

/**
 * Generates an innovation counter object
 * @returns A new innovation counter.
 */
export class InnovationCounter {
  private splitLinks: SplitLinkRecord[] = []
  private newLinks: NewLinkRecord[] = []
  private innovation: number = 1
  private neuronInnovationId: number = 1
  private species: number = 1
  private genomeCount: number = 1

  // Force an innovation increment
  public nextLinkInnovation() {
    return this.innovation++;
  }

  public nextNeuronInnovation() {
    return this.neuronInnovationId++;
  }

  public nextSpecies() {
    return this.species++;
  }

  public genePoolSize() {
    return this.innovation;
  }

  public nextGenome() {
    return this.genomeCount++;
  }

  // Use NEAT's way of splitting - innovation number is the same
  // whenever the same link gets split in two different genomes.
  public innovationForLinkSplit(fromNeuron: Neuron<any>, toNeuron: Neuron<any>, newNeuron: Neuron<any>): InnovationIds {
    const link = this.splitLinks.find(link => link.fromNeuron.equals(fromNeuron) && link.toNeuron.equals(toNeuron));
    if (link) {
      return link.innovationIds
    } else {
      const newNeuronId = this.nextNeuronInnovation();
      const innovationIds: InnovationIds = {
        firstLink: this.innovationForNewLink(fromNeuron, newNeuron),
        secondLink: this.innovationForNewLink(newNeuron, toNeuron),
        neuron: newNeuronId
      }
      const splitLinkRecord: SplitLinkRecord = {
        fromNeuron,
        toNeuron,
        innovationIds,
      }
      this.splitLinks.push(splitLinkRecord)
      return innovationIds
    }
  }

  // For the insertion of new links, innovation id should always be the same
  innovationForNewLink(fromNeuron: Neuron<any>, toNeuron: Neuron<any>): number {
    const link = this.newLinks.find(link => link.fromNeuron.equals(fromNeuron) && link.toNeuron.equals(toNeuron))
    if (link) {
      return link.innovationId
    } else {
      const innovationId = this.nextLinkInnovation()
      const linkRecord = {
        fromNeuron,
        toNeuron,
        innovationId
      }
      this.newLinks.push(linkRecord)
      return innovationId
    }
  }
}

interface InnovationIds {
  firstLink: number,
  secondLink: number,
  neuron: number,
}

interface SplitLinkRecord {
  fromNeuron: Neuron<any>,
  toNeuron: Neuron<any>,
  innovationIds: InnovationIds
}

interface NewLinkRecord {
  fromNeuron: Neuron<any>,
  toNeuron: Neuron<any>,
  innovationId: number,
}