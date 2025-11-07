from django.db import models

# Create your models here.
class Node(models.Model):
    id = models.IntegerField(primary_key=True)
    type = models.CharField(max_length=50, default='Unknown')
    text = models.TextField(default='Unknown')

    def __str__(self):
        return str(self.id)
    
class Edge(models.Model):
    from_node = models.ForeignKey(Node, related_name='from_nodes', on_delete=models.CASCADE)
    to_node = models.ForeignKey(Node, related_name='to_nodes', on_delete=models.CASCADE)
    weight = models.FloatField()

    def __str__(self):
        return f"{self.from_node} -> {self.to_node} (Weight: {self.weight})"

class Graph(models.Model):
    id = models.AutoField(primary_key=True)
    text = models.TextField(default='Unknown')
    nodes = models.ManyToManyField(Node)
    edges = models.ManyToManyField(Edge)

    def __str__(self):
        return self.text