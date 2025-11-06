from django.db import models

# Create your models here.
class Node(models.Model):
    name = models.CharField(max_length=100)
    entity = models.CharField(max_length=50)
    type = models.CharField(max_length=50)
    text = models.TextField()

    def __str__(self):
        return self.name
    
class Edge(models.Model):
    from_node = models.ForeignKey(Node, related_name='from_nodes', on_delete=models.CASCADE)
    to_node = models.ForeignKey(Node, related_name='to_nodes', on_delete=models.CASCADE)
    weight = models.FloatField()

    def __str__(self):
        return f"{self.from_node} -> {self.to_node} (Weight: {self.weight})"

class Graph(models.Model):
    name = models.CharField(max_length=100)
    text = models.TextField()
    nodes = models.ManyToManyField(Node)
    edges = models.ManyToManyField(Edge)

    def __str__(self):
        return self.name